import { Node } from 'node-red'
import { Actions, Events, Event } from './link-store.common'
import { URL } from 'url'
import { AsyncContext } from '../context'
import humanInterval from 'human-interval'
import hastParser from 'hast-util-raw'
import { selectAll } from 'hast-util-select'
import * as Hast from 'hast'
import normalizeUrl from 'normalize-url'
import { axios } from '../axios'

type RedditLink = {
  id: string
  url: string
  sourceType: 'REDDIT.V1'
  sourceUrl: string
  createdAt: string
}

type GenericLink = {
  id: string
  url: string
  sourceType: 'GENERIC.V1'
  sourceUrl: string
  createdAt: string
}

export type Item = RedditLink | GenericLink

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
      case 'GENERIC.V1': {
        const links = await unshortenUrls(getUrls(action.payload.text))

        for (const link of links) {
          const id = generateId()
          await context.set<GenericLink>(id, {
            id,
            sourceType: 'GENERIC.V1',
            sourceUrl: action.payload.url,
            url: link,
            createdAt: action.payload.createdAt,
          })
        }
        node.status({ fill: 'green', shape: 'dot', text: `Last added ${action._msgid} ${time()}` })
        return done()
      }
      case 'REDDIT_SELF.V1': {
        const replies: string[] = action.payload.replies.flatMap((it: RedditReply) => flattenReplies(it))

        const links = [action.payload.text, ...replies].reduce((acc, text) => {
          const urls = getUrls(text)
          return [...acc, ...urls]
        }, [] as string[])

        const unshortenedLinks = await unshortenUrls(links)

        for (const link of (await unshortenedLinks)
          .filter((it) => !it.includes('np.reddit.com/message/compose'))
          .filter((it) => !it.includes('np.reddit.com/r/RemindMeBot'))) {
          const id = generateId()
          await context.set<RedditLink>(id, {
            id,
            sourceType: 'REDDIT.V1',
            sourceUrl: action.payload.permalink,
            url: link,
            createdAt: action.payload.createdAt,
          })
        }
        node.status({ fill: 'green', shape: 'dot', text: `Last added ${action._msgid} ${time()}` })
        return done()
      }
      case 'REDDIT_ARTICLE.V1': {
        const replies: string[] = action.payload.replies.flatMap((it: RedditReply) => flattenReplies(it))

        const links = [...replies].reduce(
          (acc, text) => {
            const urls = getUrls(text)
            return [...acc, ...urls]
          },
          [action.payload.link] as string[],
        )

        const unshortenedLinks = await unshortenUrls(links)

        for (const link of unshortenedLinks
          .filter((it) => !it.includes('np.reddit.com/message/compose'))
          .filter((it) => !it.includes('np.reddit.com/r/RemindMeBot'))) {
          const id = generateId()
          await context.set<RedditLink>(id, {
            id,
            sourceType: 'REDDIT.V1',
            sourceUrl: action.payload.permalink,
            url: link,
            createdAt: action.payload.createdAt,
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
          if (
            action.payload &&
            Date.now() - new Date(item.createdAt).valueOf() > humanInterval(action.payload.since)!
          ) {
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

function uuid() {
  return Math.random().toString(36).substring(7)
}

function generateId() {
  return `${Date.now()}-${uuid()}`
}

interface RedditReply {
  text: string
  score: number
  replies: RedditReply[]
  createdAt: string
}

export function flattenReplies(reply: RedditReply): string[] {
  if (reply.replies.length === 0) {
    return [reply.text]
  }
  return [reply.text, ...reply.replies.flatMap((it) => flattenReplies(it))]
}

function onlyUnique(value: string, index: number, self: string[]) {
  return self.indexOf(value) === index
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
  return urls.map((it) => normalizeUrl(it, { defaultProtocol: 'https:' })).filter(onlyUnique)
}

async function unshortenUrls(urls: string[]): Promise<string[]> {
  const parsed = []
  for (const url of urls) {
    const originalLink = await unwrap(url)
    parsed.push(originalLink)
  }
  return parsed.map((it) => normalizeUrl(it, { defaultProtocol: 'https:' })).filter(onlyUnique)
}

async function unwrap(url: string): Promise<string> {
  try {
    const response = await axios(url, { method: 'HEAD' })
    return response.request.res.responseUrl
  } catch {}

  return url
}
