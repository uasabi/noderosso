import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  send: Message.extend({
    topic: z.literal('SEND.V1'),
    payload: z.object({
      channelLink: z.string().url().nonempty(),
      message: z.string().nonempty(),
    }),
  }),
  failed: z.object({
    topic: z.literal('FAILED.V1'),
    payload: z.object({
      message: z.string().nonempty(),
    }),
  }),
}

export const actions = Schema.send
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
  failed(args: Omit<z.infer<typeof Schema.failed>, 'topic'>['payload']): z.infer<typeof Schema.failed> {
    return { topic: 'FAILED.V1' as const, payload: args }
  },
}
