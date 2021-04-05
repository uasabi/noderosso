import { Node } from 'node-red'
import { Actions, Events, Event } from './reddit-scraper.common'
import { axios, prettyAxiosErrors, AxiosResponse } from '../axios'
import * as chrono from 'chrono-node'
import { URL } from 'url'
import { differenceInHours } from 'date-fns'
import { stringify } from 'querystring'
import { setTimeout } from 'timers'

export function Setup({
  node,
  subreddit,
  redditBaseUrl = 'https://www.reddit.com',
  pushshiftBaseUrl = 'https://api.pushshift.io',
  maxDaysPerPage,
}: {
  node: Node
  redditBaseUrl?: string
  subreddit: string
  pushshiftBaseUrl?: string
  maxDaysPerPage: number
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FETCH.V1': {
        const before = (chrono.parseDate(action.payload.before ?? '') as Date | null) ?? new Date()
        const beforeInDays = Math.floor(Math.floor(differenceInHours(new Date(), before) / 24))

        const after = chrono.parseDate(action.payload.after ?? '') as Date | null
        const afterInDays = after ? Math.ceil(differenceInHours(new Date(), after) / 24) : beforeInDays + maxDaysPerPage

        const posts = [] as { permalink: string; created_utc: number }[]

        for (let page = beforeInDays; page <= afterInDays; page += maxDaysPerPage) {
          const args = stringify({
            subreddit,
            size: 500,
            before: `${page}d`,
            after: `${page + maxDaysPerPage}d`,
            ...(isString(action.payload.title) ? { title: action.payload.title } : {}),
          })

          const pushshiftUrl = `${pushshiftBaseUrl}/reddit/search/submission/?${args}&fields=${[
            'permalink',
            'created_utc',
          ].join(',')}`
          let response: AxiosResponse<PushShiftResponse>

          try {
            node.log(`Fetching ${pushshiftUrl}`)
            response = await Promise.all([axios.get<PushShiftResponse>(pushshiftUrl), wait(1000)]).then(
              ([it, _]) => it!,
            )
          } catch (error) {
            const message = prettyAxiosErrors(error)({
              not200: (response) => `Received ${response.status} response (expecting 200) for ${pushshiftUrl}`,
              noResponse: () => `Timeout while fetching ${pushshiftUrl}`,
              orElse: () => `Generic error while fetching ${pushshiftUrl}`,
            })
            node.error(message)
            continue
          }

          node.log(`Found ${response.data.data.length} entries`)
          response.data.data.forEach((it) => posts.push(it))
        }

        let counter = 0

        const relevantPosts = posts.filter((it) => {
          const date = it.created_utc * 1000
          return date < before.valueOf() && date > (after?.valueOf() ?? 0)
        })

        for (const post of relevantPosts) {
          if (!isString(post.permalink)) {
            continue
          }

          const url = `${redditBaseUrl}${post.permalink}`
          const fullPost = await fetchPost(url)

          if (fullPost instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(`Error while fetching the post ${url}:\n[${fullPost.name}]: ${fullPost.message}`)
            continue
          }

          counter++

          switch (fullPost.type) {
            case 'link':
              send(
                Event.postWithLink({
                  link: fullPost.link,
                  score: fullPost.score,
                  replies: fullPost.replies,
                  permalink: fullPost.permalink,
                  createdAt: fullPost.createdAt,
                }),
              )
              break
            case 'self':
              send(
                Event.postSelf({
                  text: fullPost.text,
                  score: fullPost.score,
                  replies: fullPost.replies,
                  permalink: fullPost.permalink,
                  createdAt: fullPost.createdAt,
                }),
              )
              break
            default:
              break
          }
        }

        node.status({ fill: 'green', shape: 'dot', text: `Extracted ${counter} posts ${time()}` })
        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}

export interface RedditNestable<T = {}> {
  kind: 'Listing' | 't3'
  data: T & {
    children: Array<RedditNestable<T>>
    after?: string | null
    before?: string | null
  }
}

export interface RedditResponse {
  name: string
  title: string
  selftext_html: string | null
  selftext: string | null
  url_overridden_by_dest?: string
  replies?: string | RedditNestable
  body_html?: string
  body?: string
  url?: string
  permalink?: string
  created_utc: number
  stickied?: boolean
  score: number
}

export async function fetchPost(url: string): Promise<FetchingError | RedditLinkPost | RedditSelfPost> {
  let response: AxiosResponse<RedditNestable<RedditResponse>[]>
  try {
    const escapedUrl = new URL(url).toString()
    response = await axios.get<RedditNestable<RedditResponse>[]>(`${escapedUrl}.json`)
  } catch (error) {
    return prettyAxiosErrors(error)({
      not200: (response) => new FetchingError(`Received ${response.status} response (expecting 200) for ${url}`),
      noResponse: () => new FetchingError(`Timeout while fetching ${url}`),
      orElse: () => new FetchingError(`Generic error while fetching ${url}`),
    })
  }

  const replies = extractReplies(response.data)
  const createdAt = isValidDate(new Date((response.data?.[0]?.data?.children?.[0]?.data.created_utc ?? 0) * 1000))
    ? new Date((response.data?.[0]?.data?.children?.[0]?.data.created_utc ?? 0) * 1000).toISOString()
    : new Date().toISOString()

  const articleUrl = response.data?.[0]?.data?.children?.[0]?.data?.url_overridden_by_dest
  if (isValidUrl(articleUrl)) {
    return {
      type: 'link',
      link: articleUrl,
      score: response.data?.[0]?.data?.children?.[0]?.data?.score ?? 0,
      replies,
      permalink: url,
      createdAt,
    }
  }

  return {
    type: 'self',
    text: decodeHTMLEntities(response.data?.[0]?.data?.children?.[0]?.data?.selftext_html ?? ''),
    score: response.data?.[0]?.data?.children?.[0]?.data?.score ?? 0,
    replies,
    permalink: url,
    createdAt,
  }
}

export function extractReplies(payload: RedditNestable<RedditResponse>[]): RedditReply[] {
  if (payload.length !== 2) {
    return []
  }
  const comments = payload[1]!
  return comments.data.children.map((it) => extract(it))

  function extract(obj: RedditNestable<RedditResponse>): RedditReply {
    const replies = obj?.data?.replies
    const text = obj?.data?.body_html ?? ''
    const permalink = obj?.data?.permalink
    const createdAt = new Date(obj.data.created_utc * 1000)
    if (isNestable(replies)) {
      return {
        text: decodeHTMLEntities(text),
        replies: replies.data.children.map((it) => extract(it as any)),
        score: obj.data.score,
        createdAt: isValidDate(createdAt) ? createdAt.toISOString() : new Date().toISOString(),
        permalink,
      }
    }
    return {
      text: decodeHTMLEntities(text),
      replies: [],
      score: obj.data.score,
      createdAt: isValidDate(createdAt) ? createdAt.toISOString() : new Date().toISOString(),
      permalink,
    }
  }
}

function isNestable(value: unknown): value is RedditNestable {
  return isObject(value) && hasOwnProperty(value, 'kind') && value.kind === 'Listing'
}

function isObject(obj: unknown): obj is object {
  return {}.toString.call(obj) === '[object Object]' && obj != null
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop)
}

function decodeHTMLEntities(text: string): string {
  return [
    ['amp', '&'],
    ['apos', "'"],
    ['#x27', "'"],
    ['#x2F', '/'],
    ['#39', "'"],
    ['#47', '/'],
    ['lt', '<'],
    ['gt', '>'],
    ['nbsp', ' '],
    ['quot', '"'],
  ].reduce((acc, [entity, char]) => {
    if (!entity || !char) {
      return acc
    }

    return acc.replace(new RegExp(`&${entity};`, 'g'), char)
  }, text)
}

function isValidUrl(url: unknown): url is string {
  if (!isString(url)) {
    return false
  }

  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

class FetchingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FetchingError'
  }
}

interface RedditSelfPost {
  type: 'self'
  text: string
  score: number
  replies: RedditReply[]
  permalink: string
  createdAt: string
}

interface RedditLinkPost {
  type: 'link'
  link: string
  score: number
  replies: RedditReply[]
  permalink: string
  createdAt: string
}

interface RedditReply {
  text: string
  score: number
  replies: RedditReply[]
  createdAt: string
  permalink?: string
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.valueOf())
}

interface PushShiftResponse {
  data: {
    permalink: string
    created_utc: number
  }[]
}

async function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
