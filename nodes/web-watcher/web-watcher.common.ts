import * as z from 'zod'
import { inspect } from 'util'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  fetch: Message.extend({
    topic: z.literal('FETCH.V1'),
  }),
  change: z.object({
    topic: z.literal('CHANGE.V1'),
    payload: z.object({
      current: z.string().nonempty(),
      previous: z.string().nonempty(),
    }),
  }),
}

export const actions = z.union([Schema.flush, Schema.fetch])
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if ('topic' in action && isString(action.topic)) {
    return action as z.infer<typeof actions>
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  if (action.payload === 'flush') {
    return { topic: 'FLUSH.V1', _msgid: action._msgid }
  }
  return {
    topic: 'FETCH.V1' as const,
    _msgid: action._msgid,
  }
}

export const Event = {
  change(args: Omit<z.infer<typeof Schema.change>, 'topic'>['payload']): z.infer<typeof Schema.change> {
    return { topic: 'CHANGE.V1' as const, payload: args }
  },
}

export const events = Schema.change
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
