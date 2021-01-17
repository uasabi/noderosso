import { Node } from 'node-red'
import { Actions, Events, Event } from './link-store.common'
import { inspect } from 'util'
import { URL } from 'url'
import { axios, prettyAxiosErrors } from '../axios'
import { AsyncContext } from '../context'
import humanInterval from 'human-interval'
import hastParser from 'hast-util-raw'
import { selectAll } from 'hast-util-select'
import * as Hast from 'hast'
import normalizeUrl from 'normalize-url'

type RedditLink = {
  id: string
  url: string
  sourceType: 'REDDIT.V1'
  sourceUrl: string
  createdAt: string
}

export type Item = RedditLink

export function Setup({ node, context }: { node: Node; context: AsyncContext }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        const keys = await context.keys()
        for (const key of keys) {
          await context.set(key)
        }
        node.status({})
        return done()
      }
      case 'REDDIT.V1': {
        const links = [] as string[]
        try {
          const url = action.payload.url.endsWith('/') ? action.payload.url : `${action.payload.url}/`
          const response = await axios.get<RedditNestable<RedditResponse>[]>(`${url}.json`)
          const selfText = response.data?.[0]?.data?.selftext_html
          const html = decodeHTMLEntities(selfText ?? '')
          const urls = getUrls(html)
          urls.forEach((it) => links.push(it))
          const articleUrl = response.data?.[0]?.data?.children?.[0]?.data?.url_overridden_by_dest
          if (isString(articleUrl)) {
            try {
              const url = new URL(articleUrl)
              links.push(url.toString())
            } catch {}
          }
          const comments = extractComments(response.data).flatMap((it) => flattenComments(it))
          comments.forEach((comment) => {
            const urls = getUrls(comment)
            urls.forEach((it) => links.push(it))
          })
        } catch (error) {
          console.log(error)
        }
        for (const link of links
          .filter(onlyUnique)
          .filter((it) => !it.includes('np.reddit.com/message/compose'))
          .filter((it) => !it.includes('np.reddit.com/r/RemindMeBot'))) {
          const id = generateId()
          await context.set<RedditLink>(id, {
            id,
            sourceType: 'REDDIT.V1',
            sourceUrl: action.payload.url,
            url: link,
            createdAt: new Date().toISOString(),
          })
        }
        node.status({ fill: 'green', shape: 'dot', text: `Last added ${action._msgid} ${time()}` })
        return done()
      }
      case 'DIGEST.V1': {
        const keys = await context.keys()
        const items = [] as Item[]
        for (const key of keys) {
          const item = await context.get<Item>(key)
          if (!item) {
            continue
          }
          if (Date.now() - new Date(item.createdAt).valueOf() > humanInterval(action.payload.since)!) {
            continue
          }
          items.push(item)
        }
        const digest = items.reduce((acc, it) => {
          if (!(it.url in acc)) {
            acc[it.url] = []
          }
          acc[it.url] = [...acc[it.url], it]
          return acc
        }, {} as Record<string, Item[]>)
        send(Event.report(digest))
        node.status({ fill: 'green', shape: 'dot', text: `Digest sent` })
        return done()
      }
      default:
        assertUnreachable(action)
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
  title: string
  selftext_html: string | null
  selftext: string | null
  url_overridden_by_dest?: string
  replies?: string | RedditNestable
  body_html?: string
  body?: string
  url?: string
}

function uuid() {
  return Math.random().toString(36).substring(7)
}

function generateId() {
  return `${Date.now()}-${uuid()}`
}

interface NestedComment {
  text: string
  replies: NestedComment[]
}

export function extractComments(payload: RedditNestable<RedditResponse>[]): NestedComment[] {
  if (payload.length !== 2) {
    return []
  }
  const comments = payload[1]!
  return comments.data.children.map((it) => extract(it))

  function extract(obj: RedditNestable<RedditResponse>): NestedComment {
    const replies = obj?.data?.replies
    const text = obj?.data?.body_html ?? ''
    if (isNestable(replies)) {
      return { text: decodeHTMLEntities(text), replies: replies.data.children.map((it) => extract(it as any)) }
    }
    return { text: decodeHTMLEntities(text), replies: [] }
  }
}

export function flattenComments(comment: NestedComment): string[] {
  if (comment.replies.length === 0) {
    return [comment.text]
  }
  return [comment.text, ...comment.replies.flatMap((it) => flattenComments(it))]
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

function onlyUnique(value: string, index: number, self: string[]) {
  return self.indexOf(value) === index
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

function parseHtml(content: string) {
  return hastParser({
    type: 'root',
    children: [
      { type: 'doctype', name: 'html' },
      { type: 'raw', value: content ?? '' },
    ],
  })
}

function getUrls(html: string): string[] {
  const hast = parseHtml(html)
  const urls = selectAll<Hast.Element>('a', hast)
    .map((it) => it.properties.href)
    .filter((it) => {
      if (!isString(it)) {
        return false
      }
      try {
        new URL(it)
        return true
      } catch {
        return false
      }
    }) as string[]
  return urls.map((it) => normalizeUrl(it, { defaultProtocol: 'https:' }))
}
