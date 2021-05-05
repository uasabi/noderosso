import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  tweet: Message.extend({
    topic: z.literal('QUEUE.V1'),
    payload: z.object({
      variations: z
        .array(
          z.object({
            text: z.string().nonempty(),
            images: z.array(z.string().url()).max(4),
          }),
        )
        .min(1),
    }),
  }),
  tick: Message.extend({
    topic: z.literal('TICK.V1'),
    payload: z.number(),
  }),
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  reschedule: Message.extend({
    topic: z.literal('RESCHEDULE_ALL.V1'),
    // payload: z
    //   .object({ shuffle: z.boolean() })
    //   .optional()
    //   .transform((it) => it ?? { shuffle: false }),
  }),
  published: Message.extend({
    topic: z.literal('PUBLISHED.V1'),
    payload: z.object({
      tweetId: z.string().nonempty(),
      id: z.string().nonempty(),
    }),
  }),
  gc: Message.extend({
    topic: z.literal('GARBAGE_COLLECTION.V1'),
    payload: z.number(),
  }),
  publish: z.object({
    topic: z.literal('PUBLISH.V1'),
    payload: z.object({
      id: z.string().nonempty(),
      text: z.string().nonempty(),
      images: z.array(z.string().url()).max(4),
    }),
  }),
}

export const actions = z.union([
  Schema.tweet,
  Schema.tick,
  Schema.flush,
  Schema.reschedule,
  Schema.published,
  Schema.gc,
])
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  publish(args: Omit<z.infer<typeof Schema.publish>, 'topic'>['payload']): z.infer<typeof Schema.publish> {
    return { topic: 'PUBLISH.V1' as const, payload: args }
  },
}

export const events = Schema.publish
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}
