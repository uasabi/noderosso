import * as z from 'zod'
import { objectUtil } from 'zod/lib/src/helpers/objectUtil'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  in: Message.extend({
    topic: z.literal('IN.V1'),
    payload: z.object({ message: z.string().nonempty() }),
  }),
  out: z.object({
    topic: z.literal('OUT.V1'),
    payload: z.object({
      message: z.string().nonempty(),
    }),
  }),
}

export const actions = Schema.in
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  article(args: Omit<z.infer<typeof Schema.out>, 'topic'>['payload']): z.infer<typeof Schema.out> {
    return { topic: 'OUT.V1' as const, payload: args }
  },
}

export const events = Schema.out
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)
