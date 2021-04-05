import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  import: Message.extend({
    topic: z.literal('IMPORT.V1'),
    payload: z.object({
      csv: z.string().nonempty(),
    }),
  }),
  tweet: z.object({
    topic: z.literal('TWEET.V1'),
    payload: z.object({
      text: z.string().nonempty(),
      images: z.string().array(),
    }),
  }),
}

export const TweetSchema = z.object({
  link: z.string().url().nonempty(),
  description: z.string().nonempty(),
  image_1: z.string().nullable().optional(),
  image_2: z.string().nullable().optional(),
})

export type ParsedTweet = z.infer<typeof TweetSchema>
export type Tweet = {
  text: string
  images: string[]
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
