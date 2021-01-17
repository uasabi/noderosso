import { Node } from 'node-red'
import { Actions, Events, Event } from './reddit-scraper.common'
import { inspect } from 'util'
import { axios, prettyAxiosErrors } from '../axios'
import * as chrono from 'chrono-node'

const MAX_FETCHES = 40

export function Setup({ node }: { node: Node }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FETCH.V1': {
        const from = action.payload.from ? chrono.parseDate(action.payload.from) : null
        const to: Date = action.payload.to ? chrono.parseDate(action.payload.to) : new Date()
        const subredditUrl = parseSubredditUrl(action.payload.subreddit)

        node.log(`Fetching ${subredditUrl} ${from ? `from ${from}` : '1 page'} until ${to.toISOString()}`)

        if (!from) {
          try {
            let counter = 0
            const response = await axios.get<RedditNestable<RedditResponse>>(subredditUrl)
            response.data.data.children.forEach((post) => {
              const postedAt = post.data.created_utc * 1000
              const isTooRecent = postedAt > to.valueOf()
              if (isString(post.data.permalink) && !isTooRecent) {
                counter++
                send(Event.post({ url: `https://www.reddit.com${post.data.permalink}` }))
              }
            })
            node.status({ fill: 'green', shape: 'dot', text: `Extracted ${counter} posts ${time()}` })
          } catch (error) {
            console.log(error)
          }
          return done()
        }

        let isComplete = false
        let i = 0
        let counter = 0
        let nextId: string | null = null
        try {
          for (; i < MAX_FETCHES; i++) {
            if (isComplete) {
              break
            }
            console.log('fetching ', `${subredditUrl}${nextId ? `?after=${nextId}` : ''}`)
            const response = await axios.get<RedditNestable<RedditResponse>>(
              `${subredditUrl}${nextId ? `?after=${nextId}` : ''}`,
            )
            const after = response.data.data.after ?? null
            response.data.data.children
              .sort((a, b) => {
                return b.data.created_utc - a.data.created_utc
              })
              .forEach((post) => {
                const postedAt = post.data.created_utc * 1000
                const isTooRecent = postedAt > to.valueOf()
                const isTooOld = from.valueOf() > postedAt
                if (isString(post.data.permalink) && !isTooRecent && !isTooOld) {
                  send(Event.post({ url: `https://www.reddit.com${post.data.permalink}` }))
                  counter++
                }
                if (post.data.stickied !== true && isTooOld) {
                  isComplete = true
                }
              })
            nextId = after as any
            console.log('nextid', isComplete, nextId)
          }
          if (i === 10 && !isComplete) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}. Reached max fetches, still not enough` })
          } else {
            node.status({ fill: 'green', shape: 'dot', text: `Extracted ${counter} posts ${time()}` })
          }
        } catch {}
        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
}

function parseSubredditUrl(name: string): string {
  const nameWithStart = parseStart(name)

  return `${nameWithStart.endsWith('/') ? nameWithStart : `${nameWithStart}/`}.json`

  function parseStart(name: string): string {
    if (name.startsWith('https://www.reddit.com')) {
      return name
    }
    if (name.startsWith('/r/')) {
      return `https://www.reddit.com${name}`
    }
    if (name.startsWith('r/')) {
      return `https://www.reddit.com/${name}`
    }
    if (name.startsWith('/')) {
      return `https://www.reddit.com/r${name}`
    }
    return `https://www.reddit.com/r/${name}`
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
}
