import { Node } from 'node-red'
import Parser from 'rss-parser'
import { AsyncContext } from '../context'
import { Events, Event, Actions } from './feedparse.common'
import { inspect } from 'util'
import { URL } from 'url'
import { axios, prettyAxiosErrors, AxiosResponse } from '../axios'

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

          let newItems = 0
          for (const item of feed.items) {
            const itemId = toId(item.guid ?? item.link!)
            const previousArticle = await context.get(itemId)
            if (!previousArticle) {
              newItems = newItems + 1
              await context.set(itemId, Date.now())
              const url = item.origlink ?? item.link ?? ''
              send(
                Event.message({
                  url: urlOrEmptyString(url),
                  content: item.content,
                  title: item.title,
                  publishedDate: item.pubDate ?? new Date().toISOString(),
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

function urlOrEmptyString(value: string): string {
  try {
    return new URL(value).toString()
  } catch {
    return ''
  }
}
