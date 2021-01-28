import { Node } from 'node-red'
import Parser, { Item } from 'rss-parser'
import { AsyncContext } from '../context'
import { Events, Event, Actions } from './feedparse.common'
import { inspect } from 'util'
import { URL } from 'url'
import { axios, prettyAxiosErrors, AxiosResponse } from '../axios'
import { parseDate } from 'chrono-node'

export function Setup({ context, ttl, node, url }: { context: AsyncContext; ttl: number; node: Node; url: string }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        const keys: string[] = await context.keys()
        for (const key of keys) {
          await context.set(key)
        }
        return done()
      }
      case 'GARBAGE_COLLECTION.V1': {
        let removed = 0
        const keys: string[] = await context.keys()
        for (const key of keys) {
          const time = await context.get<number>(key)
          if (!time) {
            node.error(`Invalid key ${key} detect. Deleting...`)
            await context.set(key)
            continue
          }
          if (Date.now() - time > ttl) {
            removed += 1
            await context.set(key)
          }
        }
        node.log(`Purging ${removed} elements from ${url} cache`)
        return done()
      }
      case 'FETCH.V1': {
        const after = parseDate(action.payload?.after ?? '') as Date | null
        const before = parseDate(action.payload?.before ?? '') as Date | null

        const startTime = process.hrtime()
        node.status({ fill: 'yellow', shape: 'dot', text: `Requesting ${url} ${time()}` })

        let response: AxiosResponse
        try {
          response = await axios.get<string | null | undefined>(new URL(url).toString())
        } catch (error) {
          const errorMessage = prettyAxiosErrors(error)({
            not200: (response) => {
              return `GET ${url.toString()} ${response.status}\n${inspect(response.headers)}\n${inspect(response.data)}`
            },
            noResponse: (request) => {
              return `No response: GET ${url.toString()}`
            },
            orElse: (message) => {
              return `GET ${url.toString()} unknown error message ${message}`
            },
          })
          node.error(errorMessage)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          return done()
        }

        if (!response.data) {
          node.warn(`Failed fetching ${url}, empty response`)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          return done()
        }

        node.status({})

        try {
          const parser = new Parser()
          const feed = await parser.parseString(response.data)

          if (!Array.isArray(feed.items)) {
            return done()
          }

          const items = feed.items
            .filter((it) => {
              return isValidUrl(it.origlink ?? it.link)
            })
            .map((it) => {
              return {
                guid: it.guid?.trim()?.length ?? 0 > 0 ? it.guid!.trim() : undefined,
                url: (it.origlink ?? it.link) as string,
                content: parseContent(it),
                title: it.title?.trim()?.length ?? 0 > 0 ? it.title!.trim() : undefined,
                publishedDate: (parseDate(it.pubDate ?? '') ?? new Date()).toISOString(),
              }
            })
            .filter((it) => {
              return before ? before.valueOf() > new Date(it.publishedDate).valueOf() : true
            })
            .filter((it) => {
              return after ? new Date(it.publishedDate).valueOf() > after.valueOf() : true
            })

          let newItems = 0
          for (const item of items) {
            const itemId = toId(item.guid ?? item.url)
            const previousArticle = await context.get(itemId)
            if (!previousArticle) {
              newItems = newItems + 1
              ttl > 0 ? await context.set(itemId, Date.now()) : null
              send(
                Event.message({
                  url: item.url,
                  content: item.content,
                  title: item.title,
                  publishedDate: item.publishedDate,
                }),
              )
            }
          }

          node.log(`Found ${newItems} new items in ${url} in ${process.hrtime(startTime)[0]} seconds`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Found ${newItems} new items ${time()}`,
          })
        } catch (error) {
          node.error(inspect(error))
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
        }

        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
}

function toId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace('_', '-')
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}

function isValidUrl(url: unknown): url is string {
  try {
    new URL(url as any)
    return true
  } catch {
    return false
  }
}

function parseContent(item: Item): string | undefined {
  if (
    hasOwnProperty(item, 'content:encoded') &&
    isString(item['content:encoded']) &&
    item['content:encoded'].trim().length > 0
  ) {
    return item['content:encoded']
  }

  if (hasOwnProperty(item, 'content') && isString(item['content']) && item['content'].trim().length > 0) {
    return item.content
  }

  return undefined
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
