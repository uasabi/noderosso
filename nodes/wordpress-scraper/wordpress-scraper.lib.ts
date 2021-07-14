import { Node } from 'node-red'
import { Actions, Events, Event } from './wordpress-scraper.common'
import { axios, prettyAxiosErrors, AxiosResponse } from '@noderosso/packages/axios'
import * as chrono from 'chrono-node'

export function Setup({ node, baseUrl }: { node: Node; baseUrl: string }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FETCH.V1': {
        const after = chrono.parseDate(action.payload.after ?? '') as Date | null
        const before = chrono.parseDate(action.payload.before ?? '') as Date | null

        const args = [
          `${after ? `after=${after.toISOString()}` : ''}`,
          `${before ? `before=${before.toISOString()}` : ''}`,
        ]
          .filter((it) => it.length > 0)
          .join('&')

        const url = `${baseUrl}wp/v2/posts?per_page=100${args.length > 0 ? `&${args}` : ''}`
        let response: AxiosResponse<WordpressArticle[]>

        try {
          response = await axios.get<WordpressArticle[]>(url)
        } catch (error) {
          prettyAxiosErrors(error)({
            not200: (response) => `Received ${response.status} response (expecting 200) for ${url}`,
            noResponse: () => `Timeout while fetching ${url}`,
            orElse: () => `Generic error while fetching ${url}`,
          })
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}.` })
          return done()
        }

        response.data.forEach((article) => {
          send(
            Event.article({
              url: article.link,
              content: article.content.rendered,
              createdAt: article.modified_gmt,
            }),
          )
        })

        node.status({ fill: 'green', shape: 'dot', text: `Extracted ${response.data.length} posts ${time()}` })

        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}

interface WordpressArticle {
  content: {
    rendered: string
  }
  link: string
  modified_gmt: string
  date_gmt: string
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private'
}
