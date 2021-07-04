import { Node } from 'node-red'
import { AsyncContext } from '@noderosso/packages/context'
import hastParser from 'hast-util-raw'
import { select } from 'hast-util-select'
import toHtml from 'hast-util-to-html'
import Hast from 'hast'
import { Actions, Events, Event } from './web-watcher.common'
import { inspect } from 'util'
import { URL } from 'url'
import { axios, prettyAxiosErrors, AxiosResponse } from '@noderosso/packages/axios'

export function Setup({
  context,
  node,
  url,
  selector,
}: {
  context: AsyncContext
  node: Node
  url: string
  selector: string
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        await context.set('cache')
        return done()
      }
      case 'FETCH.V1': {
        const startTime = process.hrtime()
        node.status({ fill: 'yellow', shape: 'dot', text: `Requesting ${time()}` })

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

        node.status({})

        if (!response.data) {
          node.warn(`Failed fetching ${url}, empty response`)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          return done()
        }

        const hast = parseHtml(response.data)

        const partial = select<Hast.Element>(selector, hast)

        if (!partial) {
          node.log(`The selector "${selector}" produced an empty set for ${url}`)
          return done()
        }

        const partialAsHtml = toHtml({ type: 'root', children: [partial] }, { allowDangerousHtml: true })
        const previousPartialAsHtml = await context.get<string>('cache')
        node.log(`Processed ${url} in ${process.hrtime(startTime)[0]} seconds`)

        if (!previousPartialAsHtml) {
          await context.set('cache', partialAsHtml)
          return done()
        }

        if (partialAsHtml === previousPartialAsHtml) {
          return done()
        }

        await context.set('cache', partialAsHtml)

        send(Event.change({ current: partialAsHtml, previous: previousPartialAsHtml }))

        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
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

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}
