import { Node } from 'node-red'
import { Actions, Events, Event } from './reddit-scraper.common'
import { axios, prettyAxiosErrors, AxiosResponse } from '../axios'
import * as chrono from 'chrono-node'
import { URL } from 'url'

const MAX_FETCHES = 40

export function Setup({ node, baseUrl = 'https://www.reddit.com' }: { node: Node; baseUrl?: string }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FETCH.V1': {
        const from = action.payload.from ? chrono.parseDate(action.payload.from) : null
        const to: Date = action.payload.to ? chrono.parseDate(action.payload.to) : new Date()
        const subredditUrl = parseSubredditUrl(action.payload.subreddit, baseUrl)

        node.log(`Fetching ${subredditUrl} ${from ? `from ${from}` : '1 page'} until ${to.toISOString()}`)

        if (!from) {
          let response: AxiosResponse<RedditNestable<RedditResponse>>
          let counter = 0
          try {
            response = await axios.get<RedditNestable<RedditResponse>>(subredditUrl)
          } catch (error) {
            prettyAxiosErrors(error)({
              not200: (response) => `Received ${response.status} response (expecting 200) for ${subredditUrl}`,
              noResponse: () => `Timeout while fetching ${subredditUrl}`,
              orElse: () => `Generic error while fetching ${subredditUrl}`,
            })
            return done()
          }
          for (const post of response.data.data.children) {
            const postedAt = post.data.created_utc * 1000
            const isTooRecent = postedAt > to.valueOf()

            if (isString(post.data.permalink) && !isTooRecent) {
              const url = `${baseUrl}${post.data.permalink}`
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
          }
          node.status({ fill: 'green', shape: 'dot', text: `Extracted ${counter} posts ${time()}` })
          return done()
        }

        let isComplete = false
        let i = 0
        let counter = 0
        let nextId: string | null = null
        for (; i < MAX_FETCHES; i++) {
          if (isComplete) {
            break
          }
          const url = `${subredditUrl}${nextId ? `?after=${nextId}` : ''}`

          let response: AxiosResponse<RedditNestable<RedditResponse>>
          try {
            response = await axios.get<RedditNestable<RedditResponse>>(url)
          } catch (error) {
            prettyAxiosErrors(error)({
              not200: (response) => `Received ${response.status} response (expecting 200) for ${url}`,
              noResponse: () => `Timeout while fetching ${url}`,
              orElse: () => `Generic error while fetching ${url}`,
            })
            continue
          }

          const after = response.data.data.after ?? null
          const posts = response.data.data.children.sort((a, b) => {
            return b.data.created_utc - a.data.created_utc
          })
          for (const post of posts) {
            const postedAt = post.data.created_utc * 1000
            const isTooRecent = postedAt > to.valueOf()
            const isTooOld = from.valueOf() > postedAt

            if (isString(post.data.permalink) && !isTooRecent && !isTooOld) {
              const url = `${baseUrl}${post.data.permalink}`
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

            if (post.data.stickied !== true && isTooOld) {
              isComplete = true
            }
          }
          nextId = after as any
        }

        if (i === 10 && !isComplete) {
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}. Reached max fetches, still not enough` })
        } else {
          node.status({ fill: 'green', shape: 'dot', text: `Extracted ${counter} posts ${time()}` })
        }

        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
}

function parseSubredditUrl(name: string, baseUrl: string): string {
  const nameWithStart = parseStart(name)

  return `${nameWithStart.endsWith('/') ? nameWithStart : `${nameWithStart}/`}.json`

  function parseStart(name: string): string {
    if (name.startsWith(baseUrl)) {
      return name
    }
    if (name.startsWith('/r/')) {
      return `${baseUrl}${name}`
    }
    if (name.startsWith('r/')) {
      return `${baseUrl}/${name}`
    }
    if (name.startsWith('/')) {
      return `${baseUrl}/r${name}`
    }
    return `${baseUrl}/r/${name}`
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

async function fetchPost(url: string): Promise<FetchingError | RedditLinkPost | RedditSelfPost> {
  let response: AxiosResponse<RedditNestable<RedditResponse>[]>
  try {
    response = await axios.get<RedditNestable<RedditResponse>[]>(`${url}.json`)
  } catch (error) {
    return prettyAxiosErrors(error)({
      not200: (response) => new FetchingError(`Received ${response.status} response (expecting 200) for ${url}`),
      noResponse: () => new FetchingError(`Timeout while fetching ${url}`),
      orElse: () => new FetchingError(`Generic error while fetching ${url}`),
    })
  }

  const replies = extractReplies(response.data)
  const createdAt = isNumber(response.data?.[0]?.data?.children?.[0].data?.created_utc)
    ? new Date(response.data?.[0]?.data?.children?.[0].data.created_utc * 1000).toISOString()
    : new Date().toISOString()

  const articleUrl = response.data?.[0]?.data?.children?.[0]?.data?.url_overridden_by_dest
  if (isValidUrl(articleUrl)) {
    return {
      type: 'link',
      link: articleUrl,
      score: response.data?.[0]?.data?.children?.[0].data?.score ?? 0,
      replies,
      permalink: url,
      createdAt,
    }
  }

  return {
    type: 'self',
    text: decodeHTMLEntities(response.data?.[0]?.data?.children?.[0].data?.selftext_html ?? ''),
    score: response.data?.[0]?.data?.children?.[0].data?.score ?? 0,
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
    if (isNestable(replies)) {
      return {
        text: decodeHTMLEntities(text),
        replies: replies.data.children.map((it) => extract(it as any)),
        score: obj.data.score,
        createdAt: new Date(obj.data.created_utc * 1000).toISOString(),
      }
    }
    return {
      text: decodeHTMLEntities(text),
      replies: [],
      score: obj.data.score,
      createdAt: new Date(obj.data.created_utc * 1000).toISOString(),
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
  var entities = [
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
  ]

  for (var i = 0, max = entities.length; i < max; ++i)
    text = text.replace(new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1])

  return text
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

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
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
}
