import * as z from 'zod'
import { inspect } from 'util'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  flushWithTopic: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  gcWithTopic: Message.extend({
    topic: z.literal('GARBAGE_COLLECTION.V1'),
  }),
  fetch: Message.extend({
    topic: z.literal('FETCH.V1'),
    payload: z
      .object({
        after: z.string().optional(),
        before: z.string().optional(),
      })
      .optional(),
  }),
  item: z.object({
    topic: z.literal('ITEM.V1'),
    payload: z.object({
      url: z.string().url(),
      content: z.string().nonempty().optional(),
      title: z.string().nonempty().optional(),
      publishedDate: z.string().nonempty(),
    }),
  }),
}

export const actions = z.union([Schema.flushWithTopic, Schema.gcWithTopic, Schema.fetch])
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if ('topic' in action && isString(action.topic)) {
    return action as z.infer<typeof actions>
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  if (action.payload === 'flush') {
    return { topic: 'FLUSH.V1' as const, _msgid: action._msgid }
  }
  if (action.payload === 'garbage collection') {
    return { topic: 'GARBAGE_COLLECTION.V1' as const, _msgid: action._msgid }
  }
  return { topic: 'FETCH.V1' as const, _msgid: action._msgid }
}

export const Event = {
  message(args: Omit<z.infer<typeof Schema.item>, 'topic'>['payload']): z.infer<typeof Schema.item> {
    return { topic: 'ITEM.V1' as const, payload: args }
  },
}

export const events = Schema.item
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
