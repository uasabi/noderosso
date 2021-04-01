import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  tick: Message.extend({
    topic: z.literal('UPDATE_REMINDERS.V1'),
    payload: z.object({
      calendarId: z.string().nonempty(),
      now: z.string().nonempty().or(z.number()),
      before: z.string().nonempty().optional(),
      after: z.string().nonempty().optional(),
      query: z.string().optional(),
    }),
  }),
  list: Message.extend({
    topic: z.literal('LIST_CALENDARS.V1'),
  }),
  create: Message.extend({
    topic: z.literal('CREATE_EVENT.V1'),
    payload: z.object({
      calendarId: z.string().nonempty(),
      summary: z.string().nonempty(),
      startingAt: z.string().nonempty(),
      endingAt: z.string().nonempty().optional(),
      timezone: z.string().nonempty().optional(),
    }),
  }),
}

export const actions = z.union([Schema.tick, Schema.list, Schema.create])
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const events = z.void()
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

export const Event = {}
