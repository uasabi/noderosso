import * as z from 'zod'
import { inspect } from 'util'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  add: Message.extend({
    topic: z.literal('ADD.V1'),
    payload: z.any(),
  }),
  batch: z.object({
    topic: z.literal('BATCH.V1'),
    payload: z.array(z.any()),
  }),
  overflow: z.object({
    topic: z.literal('OVERFLOW.V1'),
    payload: z.any(),
  }),
}

export const Event = {
  batch(args: any[]): z.infer<typeof Schema.batch> {
    return { topic: 'BATCH.V1' as const, payload: args }
  },
  overflow(arg: any): z.infer<typeof Schema.overflow> {
    return { topic: 'OVERFLOW.V1' as const, payload: arg }
  },
}

export const events = z.union([Schema.batch, Schema.overflow])
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

export const actions = z.union([Schema.flush, Schema.add])
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if (isString(action.topic)) {
    return action
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  if (action.payload === 'flush') {
    return { topic: 'FLUSH.V1' as const, _msgid: action._msgid }
  } else {
    return { topic: 'ADD.V1' as const, payload: action.payload, _msgid: action._msgid }
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
