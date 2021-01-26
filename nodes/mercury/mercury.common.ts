import * as z from 'zod'
import { inspect } from 'util'
import { objectUtil } from 'zod/lib/src/helpers/objectUtil'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  fetch: Message.extend({
    topic: z.literal('FETCH.V1'),
    payload: z.object({
      url: z.string().url(),
      title: z.string().nonempty().optional(),
      publishedDate: z.string().nonempty().optional(),
      content: z.string().nonempty().optional(),
    }),
  }),
  readable: z.object({
    topic: z.literal('READABLE.V1'),
    payload: z.object({
      url: z.string().url(),
      title: z.string().nonempty().optional(),
      parsedTitle: z.string().nonempty().optional(),
      publishedDate: z.string().nonempty(),
      content: z.string().nonempty().optional(),
      contentAsText: z.string().nonempty().optional(),
      sourceLink: z.string().nonempty().optional(),
      description: z.string().nonempty().optional(),
      ogDescription: z.string().nonempty().optional(),
      summary: z.string().nonempty().optional(),
    }),
  }),
  readableV2: z.object({
    topic: z.literal('READABLE.V2'),
    payload: z.object({
      url: z.string().url(),
      title: z.string().nonempty().optional(),
      publishedDate: z.string().nonempty().optional(),
      description: z.string().nonempty().optional(),
      content: z.string().nonempty().optional(),
      contentAsText: z.string().nonempty().optional(),
      sourceLink: z.string().url().optional(),
      summary: z.array(z.string().nonempty()),
      links: z.array(z.string().url()),
    }),
  }),
}

export const actions = Schema.fetch
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if ('topic' in action && isString(action.topic)) {
    return action as z.infer<typeof actions>
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  return {
    payload: {
      url: action.url,
      title: action.title,
      publishedDate: action.publishedDate,
      content: action.content,
    },
    topic: 'FETCH.V1' as const,
    _msgid: action._msgid,
  }
}

export const Event = {
  message(args: Omit<z.infer<typeof Schema.readable>, 'topic'>['payload']): z.infer<typeof Schema.readable> {
    return { topic: 'READABLE.V1' as const, payload: args }
  },
  messageV2(args: Omit<z.infer<typeof Schema.readableV2>, 'topic'>['payload']): z.infer<typeof Schema.readableV2> {
    return { topic: 'READABLE.V2' as const, payload: args }
  },
}

export const events = Schema.readable
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
