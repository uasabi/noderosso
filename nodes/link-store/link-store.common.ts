import * as z from 'zod'
import { objectUtil } from 'zod/lib/src/helpers/objectUtil'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  reddit: Message.extend({
    topic: z.literal('REDDIT.V1'),
    payload: z.object({
      url: z.string().url(),
    }),
  }),
  digest: Message.extend({
    topic: z.literal('DIGEST.V1'),
    payload: z.object({
      since: z.string().nonempty(),
    }),
  }),
  report: z.object({
    topic: z.literal('REPORT.V1'),
    payload: z.record(z.any()),
  }),
}

export const actions = z.union([Schema.reddit, Schema.digest, Schema.flush])
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  report(args: Omit<z.infer<typeof Schema.report>, 'topic'>['payload']): z.infer<typeof Schema.report> {
    return { topic: 'REPORT.V1' as const, payload: args }
  },
}

export const events = Schema.report
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
