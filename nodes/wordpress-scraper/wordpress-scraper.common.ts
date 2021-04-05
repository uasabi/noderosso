import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  fetch: Message.extend({
    topic: z.literal('FETCH.V1'),
    payload: z.object({ after: z.string().optional(), before: z.string().optional() }),
  }),
  article: z.object({
    topic: z.literal('POST.V1'),
    payload: z.object({
      url: z.string().url(),
      content: z.string().nonempty(),
      createdAt: z.string(),
    }),
  }),
}

export const actions = Schema.fetch
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  article(args: Omit<z.infer<typeof Schema.article>, 'topic'>['payload']): z.infer<typeof Schema.article> {
    return { topic: 'POST.V1' as const, payload: args }
  },
}

export const events = Schema.article
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
