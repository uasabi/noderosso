import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  fetch: Message.extend({
    topic: z.literal('FETCH.V1'),
    payload: z.object({ before: z.string().optional(), after: z.string().optional(), title: z.string().optional() }),
  }),
  postWithLink: z.object({
    topic: z.literal('POST_LINK.V1'),
    payload: z.object({
      link: z.string().url(),
      score: z.number(),
      replies: z.any(),
      permalink: z.string().url(),
      createdAt: z.string(),
    }),
  }),
  selfPost: z.object({
    topic: z.literal('POST_SELF.V1'),
    payload: z.object({
      text: z.string(),
      score: z.number(),
      replies: z.any(),
      permalink: z.string().url(),
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
  postWithLink(
    args: Omit<z.infer<typeof Schema.postWithLink>, 'topic'>['payload'],
  ): z.infer<typeof Schema.postWithLink> {
    return { topic: 'POST_LINK.V1' as const, payload: args }
  },
  postSelf(args: Omit<z.infer<typeof Schema.selfPost>, 'topic'>['payload']): z.infer<typeof Schema.selfPost> {
    return { topic: 'POST_SELF.V1' as const, payload: args }
  },
}

export const events = z.union([Schema.postWithLink, Schema.selfPost])
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}
