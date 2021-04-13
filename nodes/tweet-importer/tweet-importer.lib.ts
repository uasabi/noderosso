import { Node } from 'node-red'
import { Actions, Events, Event, TweetSchema, ParsedTweet, Tweet } from './tweet-importer.common'
import { inspect } from 'util'
import parse from 'csv-parse/lib/sync'
import * as z from 'zod'
import { v2 as Cloudinary } from 'cloudinary'

const LINK_REGEX = /https?:\/\/\S+[^.]\.\w{2,}\/?[\w|\/~-]+/g

export function Setup({ node, cloudinary }: { node: Node; cloudinary: typeof Cloudinary }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'IMPORT.V1': {
        try {
          const templatedTweets = csv2Tweets({
            csv: action.payload.csv,
            totalVariations: Math.min(action.payload.totalVariations, 8),
          })

          if (templatedTweets instanceof Error) {
            const message = `Error while parsing csv \n[${templatedTweets.name}]: ${templatedTweets.message}`
            node.error(message)
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            return done()
          }

          for (const tweet of templatedTweets) {
            if (tweet instanceof Error) {
              node.error(`Parse error [${tweet.name}]: ${tweet.message}`)
            } else {
              const parsedTweet = {
                ...tweet,
                variations: tweet.variations.map((it) => {
                  return {
                    ...it,
                    images: it.images
                      .map((it) => {
                        if (it.endsWith('gif')) {
                          return cloudinary.url(it, { type: 'fetch' })
                        }
                        return cloudinary.url(it, { type: 'fetch', format: 'png' })
                      })
                      .filter((it) => !!it),
                  }
                }),
              }
              send(Event.tweet(parsedTweet))
            }
          }

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

export function csv2Tweets({
  csv,
  CTAs = ['Read on:', 'Read more:', 'Read on', 'Read more', 'More', 'More:', '👉', '→'],
  totalVariations = 2,
}: {
  csv: string
  totalVariations?: number
  CTAs?: string[]
}): Array<Tweet | TweetParseError> | CSVParseError {
  let parsedCsv: Array<Partial<ParsedTweet>> = []

  if (totalVariations < 1) {
    totalVariations = 1
  }

  try {
    parsedCsv = parse(csv, {
      columns: ['link', 'total_sources', 'sources', 'description', 'image_1', 'image_2', 'categories'],
      skip_empty_lines: true,
      ignore_last_delimiters: true,
    })
  } catch (error) {
    return new CSVParseError(inspect(error))
  }

  const firstRow = parsedCsv[0]

  const literal = (value: string) =>
    z
      .string()
      .transform((it) => it.trim().toLowerCase())
      .refine((it) => it === value)

  const firstRowSchema = z.object({
    link: literal('link'),
    description: literal('description'),
    image_1: literal('image_1'),
    image_2: literal('image_2'),
    total_sources: literal('total_sources'),
    sources: literal('sources'),
    categories: literal('categories'),
  })

  if (firstRowSchema.safeParse(firstRow).success) {
    parsedCsv = parsedCsv.slice(1)
  }

  const tweets = parsedCsv
    .map((it, index) => {
      const validate = TweetSchema.safeParse({
        link: it.link,
        description: it.description,
        image_1: it.image_1,
        image_2: it.image_2,
        categories: it.categories,
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

      const hasTwoImages = !!(it.image_1 && it.image_2)
      const isFirstImageIsGif = !!it.image_1?.endsWith('gif')
      const isSecondImageIsGif = !!it.image_2?.endsWith('gif')

      if (hasTwoImages && isFirstImageIsGif) {
        const { image_2: omit, ...rest } = it
        return { ...rest }
      }

      if (hasTwoImages && isSecondImageIsGif) {
        const { image_1: omit, ...rest } = it
        return { ...rest }
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

      let candidates = CTAs.map((cta) => {
        const content = `${it.description}\n\n${cta} ${it.link}`
        return { ...it, content, length: collapseLinks(content).length }
      })
        .filter((it) => it.length <= 280)
        .map((it) => {
          return {
            text: it.content,
            images: [it.image_1, it.image_2].filter((it) => !!it) as string[],
          }
        })

      if (candidates.length === 0) {
        return new TweetParseError(`The tweet ${it.description} is too long! Cannot add the CTA.`)
      }

      const shuffledCandidates = shuffle(candidates)

      return { variations: shuffledCandidates.slice(0, totalVariations), categories: it.categories ?? [] }
    })

  return tweets
}

function onlyUnique(value: string, index: number, self: string[]) {
  return self.indexOf(value) === index
}
