import { URL } from 'url'
import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  import: Message.extend({
    topic: z.literal('IMPORT.V1'),
    payload: z.object({
      csv: z.string().nonempty(),
      totalVariations: z.number().default(2),
    }),
  }),
  tweet: z.object({
    topic: z.literal('TWEET.V1'),
    payload: z.object({
      variations: z
        .array(
          z.object({
            text: z.string().nonempty(),
            images: z.array(z.string().url()).max(4),
          }),
        )
        .min(1),
      categories: z.array(z.string().nonempty()),
    }),
  }),
}

function formatOptionalUrl(value: string | undefined): string | undefined {
  if (!value) {
    return value
  }

  try {
    return new URL(value).toString()
  } catch {
    return undefined
  }
}

function formatUrl(value: string): string {
  try {
    return new URL(value).toString()
  } catch {
    return ''
  }
}

function supportedImages(value: string | undefined): boolean {
  if (!value) {
    return true
  }

  const pathname = new URL(value).pathname.toLowerCase()

  return ['jpg', 'png', 'gif', 'jpeg', 'svg'].some((it) => pathname.endsWith(it))
}

export const TweetSchema = z.object({
  link: z
    .string()
    .nonempty()
    .transform(formatUrl)
    .refine((it) => it.length > 0),
  description: z
    .string()
    .nonempty()
    .transform((it) =>
      it
        .replace(/\u2028/gi, '\n')
        .replace(/’/gi, "'")
        .trim(),
    ),
  image_1: z.string().optional().transform(formatOptionalUrl).refine(supportedImages),
  image_2: z.string().optional().transform(formatOptionalUrl).refine(supportedImages),
  categories: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((it) => {
      if (Array.isArray(it)) {
        return it.map((it) => it.trim().toLowerCase()).filter((it) => it.length > 0)
      }

      if (!it || it?.trim().length === 0) {
        return undefined
      }

      return it.split(',').map((it) => it.trim().toLowerCase())
    }),
})

export type ParsedTweet = z.infer<typeof TweetSchema>
export type Tweet = {
  variations: {
    text: string
    images: string[]
  }[]
  categories: string[]
}

export const actions = Schema.import
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const events = Schema.tweet
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}
export const Event = {
  tweet(args: Omit<z.infer<typeof Schema.tweet>, 'topic'>['payload']): z.infer<typeof Schema.tweet> {
    return { topic: 'TWEET.V1' as const, payload: args }
  },
}
