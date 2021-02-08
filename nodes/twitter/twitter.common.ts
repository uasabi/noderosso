import * as z from 'zod'
import { objectUtil } from 'zod/lib/src/helpers/objectUtil'

const Message = z.object({ _msgid: z.string() })
const TweetLink = z.object({
  payload: z.object({
    id: z.string().uuid().nonempty(),
    tweetId: z.string().nonempty()
  })
});

const Schema = {
  publish: Message.extend({
    topic: z.literal('PUBLISH.V1'),
    payload: z.object({
      id: z.string().uuid().nonempty(),
      text: z.string().nonempty(),
      images: z.string().url().array().max(4).optional()
    }),
  }),
  retweet: Message.extend({
    topic: z.literal('RETWEET.V1')
  }).merge(TweetLink),
  published: TweetLink.extend({
    topic: z.literal('PUBLISHED.V1')
  }),
  retweeted: TweetLink.extend({
    topic: z.literal('RETWEETED.V1')
  })
}

export const actions = z.union([Schema.publish, Schema.retweet])
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const events = z.union([Schema.published, Schema.retweeted])
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

export const Event = {
  published(args: Omit<z.infer<typeof Schema.published>, 'topic'>['payload']): z.infer<typeof Schema.published> {
    return { topic: 'PUBLISHED.V1' as const, payload: args }
  },
  retweeted(args: Omit<z.infer<typeof Schema.retweeted>, 'topic'>['payload']): z.infer<typeof Schema.retweeted> {
    return { topic: 'RETWEETED.V1' as const, payload: args }
  },
}
