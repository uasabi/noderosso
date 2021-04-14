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
  failed: z.object({
    topic: z.literal('FAILED.V1'),
    payload: z.object({ message: z.string() }),
  }),
}

export const actions = z.union([Schema.tick, Schema.list, Schema.create])
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const events = Schema.failed
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

export const Event = {
  faileed(args: Omit<z.infer<typeof Schema.failed>, 'topic'>['payload']): z.infer<typeof Schema.failed> {
    return { topic: 'FAILED.V1' as const, payload: args }
  },
}
