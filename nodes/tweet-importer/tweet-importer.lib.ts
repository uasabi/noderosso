import { Node } from 'node-red'
import { Actions, Events, Event, TweetSchema, ParsedTweet, Tweet } from './tweet-importer.common'
import { inspect } from 'util'
import parse from 'csv-parse/lib/sync'

const LINK_REGEX = /https?:\/\/\S+[^.]\.\w{2,}\/?[\w|\/~-]+/g

export function Setup({ node }: { node: Node }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'IMPORT.V1': {
        const csv = action.payload.csv
        try {
          const templatedTweets = csv2Tweets(csv)

          templatedTweets.forEach((tweet) => {
            if (tweet instanceof Error) {
              node.error(`Parse error [${tweet.name}]: ${tweet.message}`)
            } else {
              send(Event.tweet(tweet))
            }
          })
          node.status({ fill: 'green', shape: 'dot', text: `Imported ${time()}` })
        } catch (error) {
          const message = `Error while parsing csv \n${inspect(error)}`
          node.error(message)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
        }

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

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isObject(test: unknown): test is object {
  return {}.toString.call({}) === '[object Object]' && test !== null
}

function hasKeys<T extends string>(obj: object, keys: T[]): obj is { [k in T]: unknown } {
  return keys.every((it) => obj.hasOwnProperty(it))
}

function collapseLinks(text: string): string {
  const TWEET_LINK_LENGTH = 23
  const LINK_REGEX = /https?:\/\/\S+[^.]\.\w{2,}\/?[\w|\/~-]+/g
  const links = (text.match(LINK_REGEX) || []).map((link) => link.trim())
  links.forEach((link) => {
    text = text
      .split(link)
      .join(`${link.slice(0, 4)}${'.'.repeat(TWEET_LINK_LENGTH - 8)}${link.slice(link.length - 4, link.length)}`)
  })
  return text.trim()
}

function shuffle<T>(arr: T[]): T[] {
  for (let index = arr.length - 1; index > 0; index--) {
    const j = Math.floor(Math.random() * (index + 1))
    const x = arr[index]!
    arr[index] = arr[j]!
    arr[j] = x
  }
  return arr
}

function parseUrl(url: string): URL | URLParseError {
  try {
    return new URL(url)
  } catch (error) {
    return new URLParseError(`${url} is not url`)
  }
}

class URLParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'URLParseError'
  }
}

class TweetParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TweetParseError'
  }
}

class CSVParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSVParseError'
  }
}

export function csv2Tweets(csv: string): Array<Tweet | TweetParseError | CSVParseError> {
  let parsedCsv: Array<ParsedTweet | TweetParseError | CSVParseError> = []

  try {
    parsedCsv = parse(csv, {
      columns: ['link', 'total_sources', 'sources', 'description', 'image_1', 'image_2'],
      skip_empty_lines: true,
      ignore_last_delimiters: true,
    }).map((it: ParsedTweet) => {
      if (!it.image_2) return it
      return {
        ...it,
        image_2: it.image_2.split(',').join(''),
      }
    })
  } catch (error) {
    parsedCsv = [new CSVParseError(inspect(error))]
  }

  const firstRow = parsedCsv[0]

  if (
    isObject(firstRow) &&
    hasKeys(firstRow, ['link', 'total_sources', 'sources', 'description', 'image_1', 'image_2']) &&
    firstRow.description === 'description' &&
    firstRow.link === 'link' &&
    firstRow.image_1 === 'image_1' &&
    (firstRow.image_2 === 'image_2' || firstRow.image_2 === 'image_2,') &&
    firstRow.total_sources === 'total_sources' &&
    firstRow.sources === 'sources'
  ) {
    parsedCsv = parsedCsv.slice(1)
  }

  return parsedCsv
    .map((it, index) => {
      if (it instanceof Error) {
        return it
      }

      const validate = TweetSchema.safeParse({
        link: it.link,
        description: it.description,
        image_1: it.image_1,
        image_2: it.image_2,
      })
      if (validate.success) {
        return validate.data
      } else {
        const { fieldErrors, formErrors } = validate.error.flatten()
        const errorMessages = Object.keys(fieldErrors).map((it) => {
          return `${it}: ${fieldErrors[it]!.join(', ')}`
        })
        return new TweetParseError(
          `Error while parsing tweet schema at row ${index}\n${[...formErrors, ...errorMessages].join(
            '\n',
          )}\nrow: ${JSON.stringify(it, null, 2)}`,
        )
      }
    })
    .map((it) => {
      if (it instanceof Error) {
        return it
      }

      const supportedImages = [/jpg$/i, /png$/i, /gif$/i, /jpeg$/i]
      const gifRegex = /gif$/i

      if (
        isString(it.image_2) &&
        it.image_2.length > 1 &&
        supportedImages.some((ext) => {
          const url = parseUrl(it.image_2!)
          if (url instanceof Error) {
            return false
          }
          return ext.test(url.pathname)
        })
      ) {
        const url = parseUrl(it.image_2)
        if (it.image_2 && !(url instanceof Error) && gifRegex.test(url.pathname)) {
          delete it.image_1
        }
      } else {
        delete it.image_2
      }

      if (
        isString(it.image_1) &&
        it.image_1.length > 0 &&
        supportedImages.some((ext) => {
          const url = parseUrl(it.image_1!)
          if (url instanceof Error) {
            return false
          }
          return ext.test(url.pathname)
        })
      ) {
        // do nothing
      } else {
        if (it.image_2) {
          it.image_1 = it.image_2
          delete it.image_2
        } else {
          delete it.image_1
        }
      }

      return it
    })
    .map((it) => {
      if (it instanceof Error) {
        return it
      }

      if (it.description.match(LINK_REGEX)?.length || 0 > 0) {
        return new TweetParseError(`${it.description || 'unknown'} should not include any link.`)
      }

      return it
    })
    .map((it) => {
      if (it instanceof Error) {
        return it
      }

      return (Object.keys(it) as Array<keyof typeof it>).reduce((acc, key) => {
        if (it[key] && it[key]!.length > 0) {
          acc[key] = it[key]!.replace(/\u2028/gi, '\n').trim()
        }
        return acc
      }, {} as ParsedTweet)
    })
    .map((it) => {
      if (it instanceof Error) {
        return it
      }

      const CTAs = ['Read on:', 'Read more:', 'Read on', 'Read more', 'More', 'More:', '👉', '→']
      const candidates = CTAs.map((cta) => {
        const content = `${it.description}\n\n${cta} ${it.link}`
        return { ...it, content, length: collapseLinks(content).length }
      }).filter((it) => it.length <= 280)

      if (candidates.length === 0) {
        throw `The tweet ${it.description} is too long! Cannot add the CTA.`
      }

      const pickedTweet = shuffle(candidates)[0]!
      const tweet: Tweet = { text: pickedTweet.content, images: [] }
      if (pickedTweet.image_1) {
        tweet.images = [...tweet.images, pickedTweet.image_1]
      }
      if (pickedTweet.image_2) {
        tweet.images = [...tweet.images, pickedTweet.image_2]
      }

      return tweet
    })
}
