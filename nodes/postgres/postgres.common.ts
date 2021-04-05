import * as z from 'zod'
import { inspect } from 'util'

const PartsString = z.object({
  id: z.string().nonempty(),
  type: z.literal('string'),
  count: z.number().min(1),
  index: z.number().min(0),
  ch: z.string().nonempty(),
})

const PartsArray = z.object({
  id: z.string().nonempty(),
  type: z.literal('array'),
  count: z.number().min(1),
  index: z.number().min(0),
  len: z.number().positive(),
})

const PartsObject = z.object({
  id: z.string().nonempty(),
  type: z.literal('object'),
  count: z.number().min(1),
  index: z.number().min(0),
  key: z.string().nonempty(),
})

const Parts = z.union([PartsString, PartsArray, PartsObject])
export function isParts(part: unknown): part is z.infer<typeof Parts> {
  return Parts.safeParse(part).success
}

const Message = z.object({
  _msgid: z.string(),
  parts: z.union([z.undefined(), Parts]),
})

const Schema = {
  query: Message.extend({
    topic: z.literal('QUERY.V1'),
    payload: z.object({
      query: z.union([z.string().nonempty(), z.undefined()]),
    }),
  }),
  result: z.object({
    topic: z.literal('RESULT.V1'),
    payload: z.object({
      rows: z.array(z.any()),
    }),
    parts: z.union([z.undefined(), Parts]),
  }),
}

export const actions = Schema.query
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if ('topic' in action && isString(action.topic)) {
    return action as z.infer<typeof actions>
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  return {
    payload: {
      query: action.query,
    },
    topic: 'QUERY.V1' as const,
    _msgid: action._msgid,
  }
}

export const Event = {
  result(
    args: Omit<z.infer<typeof Schema.result>, 'topic'>['payload'],
    parts?: Omit<z.infer<typeof Schema.result>, 'topic'>['parts'],
  ): z.infer<typeof Schema.result> {
    return { topic: 'RESULT.V1' as const, payload: args, parts }
  },
}

export const events = Schema.result
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
