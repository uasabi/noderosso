import * as z from 'zod'
import { listTimeZones } from 'timezone-support'

const Message = z.object({
  _msgid: z.string(),
})

const formatISO8601 = /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/i

const Schema = {
  event: Message.extend({
    topic: z.literal('EVENT.V1'),
    payload: z.object({
      id: z.string().nonempty(),
      summary: z.string().nonempty().max(140),
      description: z.string().nonempty(),
      startsAt: z.string().nonempty().regex(formatISO8601),
      endsAt: z.string().nonempty().regex(formatISO8601),
      timezone: z
        .string()
        .nonempty()
        .refine((timezone) => {
          return listTimeZones().includes(timezone)
        }),
      price: z.number().min(1),
    }),
  }),
  result: z.object({
    topic: z.literal('SYNCED.V1'),
    payload: z.object({
      success: z.string().nonempty(),
    }),
  }),
}

export const actions = Schema.event
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  result(args: Omit<z.infer<typeof Schema.result>, 'topic'>['payload']): z.infer<typeof Schema.result> {
    return { topic: 'SYNCED.V1' as const, payload: args }
  },
}

export const events = Schema.result
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}
