import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const multipleOptionalEmails = z
  .union([z.array(z.string().nonempty()), z.string()])
  .optional()
  .transform((it) => {
    if (!it) {
      return undefined
    }

    if (Array.isArray(it)) {
      return it.map((it) => it.trim()).filter((it) => /@/.test(it))
    }

    return it
      .trim()
      .split(',')
      .filter((it) => /@/.test(it))
  })

const singleEmail = z.union([
  z.object({
    email: z
      .string()
      .transform((it) => it.trim())
      .refine((it) => it.length > 0 && /@/.test(it)),
    name: z.string().optional(),
  }),
  z
    .string()
    .transform((it) => it.trim())
    .refine((it) => it.length > 0 && /@/.test(it)),
])

const Schema = {
  send: Message.extend({
    topic: z.literal('SEND.V1'),
    payload: z.object({
      from: singleEmail,
      replyTo: singleEmail.optional(),
      to: z
        .union([z.array(z.string().nonempty()), z.string()])
        .transform((it) => {
          if (Array.isArray(it)) {
            return it.map((it) => it.trim()).filter((it) => /@/.test(it))
          }

          return it
            .trim()
            .split(',')
            .filter((it) => /@/.test(it))
        })
        .refine((it) => it.length > 0),
      bcc: multipleOptionalEmails,
      cc: multipleOptionalEmails,
      subject: z
        .string()
        .transform((it) => it.trim())
        .refine((it) => it.length > 0),
      attachments: z
        .array(
          z.object({ content: z.string().nonempty(), filename: z.string().nonempty(), type: z.string().optional() }),
        )
        .optional(),
      html: z.string().optional(),
      category: z.string().optional(),
      categories: z.array(z.string()).optional(),
      text: z.string().optional(),
    }),
  }),
  error: z.object({
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

export const Event = {
  error(args: Omit<z.infer<typeof Schema.error>, 'topic'>['payload']): z.infer<typeof Schema.error> {
    return { topic: 'FAILED.V1' as const, payload: args }
  },
}

export const events = Schema.error
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}
