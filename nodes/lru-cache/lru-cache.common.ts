import * as z from 'zod'
import { inspect } from 'util'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  tick: Message.extend({
    topic: z.literal('TICK.V1'),
  }),
  item: z.object({
    time: z.number(),
    value: z.unknown(),
  }),
  set: Message.extend({
    topic: z.literal('SET.V1'),
    payload: z.any(),
  }),
  expired: z.object({
    topic: z.literal('EXPIRED.V1'),
    payload: z.any(),
  }),
}

export type Item = z.infer<typeof Schema.item>
export function isItem(item: unknown): item is Item {
  return Schema.item.safeParse(item).success
}

export const Event = {
  expired(arg: any): z.infer<typeof Schema.expired> {
    return { topic: 'EXPIRED.V1' as const, payload: arg }
  },
}

export const events = Schema.expired
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

export const actions = z.union([Schema.flush, Schema.tick, Schema.set])
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if (isString(action.topic)) {
    return action
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  if (action.payload === 'flush') {
    return { topic: 'FLUSH.V1' as const, _msgid: action._msgid }
  }
  if (action.payload === 'tick') {
    return { topic: 'TICK.V1' as const, _msgid: action._msgid }
  } else {
    return { topic: 'SET.V1' as const, payload: action.payload, _msgid: action._msgid }
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
