import * as z from 'zod'
import { objectUtil } from 'zod/lib/src/helpers/objectUtil'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  fetch: Message.extend({
    topic: z.literal('FETCH.V1'),
    payload: z.object({ subreddit: z.string().nonempty(), from: z.string().optional(), to: z.string().optional() }),
  }),
  post: z.object({
    topic: z.literal('POST.V1'),
    payload: z.object({
      url: z.string().url(),
    }),
  }),
}

export const actions = Schema.fetch
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  post(args: Omit<z.infer<typeof Schema.post>, 'topic'>['payload']): z.infer<typeof Schema.post> {
    return { topic: 'POST.V1' as const, payload: args }
  },
}

export const events = Schema.post
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
