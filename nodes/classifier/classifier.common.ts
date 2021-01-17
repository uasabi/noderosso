import * as z from 'zod'
import { StatusFill, StatusShape } from 'node-red'
import { inspect } from 'util'
import { objectUtil } from 'zod/lib/src/helpers/objectUtil'

export const classifiedDocument = z.object({
  id: z.string().nonempty(),
  text: z.string(),
  keywords: z.array(z.string()),
  language: z.string(),
  category: z.string().nonempty(),
})

export const nonClassifiedDocument = classifiedDocument.omit({ category: true })

const Message = z.object({ _msgid: z.string() })

export type ClassifiedDocument = z.infer<typeof classifiedDocument>
export type NonClassifiedDocument = z.infer<typeof nonClassifiedDocument>

export const documentRecord = z.object({
  id: z.string().nonempty(),
  text: z.string(),
  keywords: z.array(z.string()),
  createdAt: z.string().nonempty(),
  category: z.string(),
  verified: z.boolean(),
  message: z.any(),
  language: z.string().nonempty(),
  autoaccept: z.union([z.boolean(), z.undefined()]),
})
export type DocumentRecord = z.infer<typeof documentRecord>

const Schema = {
  command: {
    classify: nonClassifiedDocument.extend({
      type: z.literal('CLASSIFY'),
    }),
    shutdown: z.object({
      type: z.literal('SHUTDOWN'),
      workerId: z.number().positive(),
    }),
    train: z.object({
      type: z.literal('TRAINING'),
      documents: z.array(classifiedDocument),
    }),
  },
  reply: {
    result: z.object({
      id: z.string().nonempty(),
      type: z.literal('RESULT'),
      category: z.string().nonempty(),
    }),
    log: z.object({
      type: z.literal('LOG'),
      message: z.string().nonempty(),
    }),
    error: z.object({
      type: z.literal('ERROR'),
      message: z.string().nonempty(),
    }),
    status: z.object({
      type: z.literal('STATUS'),
      text: z.string().nonempty(),
      fill: z.enum(['red', 'green', 'yellow', 'blue', 'grey']),
      shape: z.enum(['ring', 'dot']),
    }),
  },
  action: {
    flush: Message.extend({
      topic: z.literal('FLUSH.V1'),
    }),
    gc: Message.extend({
      topic: z.literal('GARBAGE_COLLECTION.V1'),
    }),
    train: Message.extend({
      topic: z.literal('TRAIN.V1'),
    }),
    shutdown: Message.extend({
      topic: z.literal('SHUTDOWN.V1'),
    }),
    addClassification: Message.extend({
      topic: z.literal('ADD_CLASSIFICATION.V1'),
      payload: z.object({
        documentId: z.string().nonempty(),
        category: z.string().nonempty(),
      }),
    }),
    classify: Message.extend({
      topic: z.literal('CLASSIFY.V1'),
      payload: z
        .object({
          text: z.string().nonempty(),
          keywords: z.array(z.string()).nullable(),
          language: z.string().nullable(),
        })
        .nonstrict(),
    }),
  },
  event: {
    classified: z.object({
      topic: z.literal('CLASSIFIED.V1'),
      payload: z
        .object({
          documentId: z.string().nonempty(),
          category: z.union([z.string(), z.undefined()]),
          text: z.string().nonempty(),
          language: z.string().nonempty(),
          keywords: z.array(z.string()),
        })
        .nonstrict(),
    }),
  },
}

export const Command = {
  classify(args: NonClassifiedDocument): z.infer<typeof Schema.command.classify> {
    return { type: 'CLASSIFY' as const, ...args }
  },
  shutdown(args: { workerId: number }): z.infer<typeof Schema.command.shutdown> {
    return { type: 'SHUTDOWN' as const, ...args }
  },
  train(args: { documents: ClassifiedDocument[] }): z.infer<typeof Schema.command.train> {
    return { type: 'TRAINING' as const, ...args }
  },
}

export const Reply = {
  result(args: { id: string; category: string }): z.infer<typeof Schema.reply.result> {
    return { type: 'RESULT' as const, ...args }
  },
  log(args: { message: string }): z.infer<typeof Schema.reply.log> {
    return { type: 'LOG' as const, ...args }
  },
  status(args: { fill: StatusFill; shape: StatusShape; text: string }): z.infer<typeof Schema.reply.status> {
    return { type: 'STATUS' as const, ...args }
  },
  error(args: { message: string }): z.infer<typeof Schema.reply.error> {
    return { type: 'ERROR' as const, ...args }
  },
}

export const commands = z.union([Schema.command.classify, Schema.command.shutdown, Schema.command.train])
export type Commands = ReturnType<typeof Command[keyof typeof Command]>
export const isCommand = commands.check.bind(commands)

export const replies = z.union([Schema.reply.error, Schema.reply.log, Schema.reply.status, Schema.reply.result])
export type Replies = ReturnType<typeof Reply[keyof typeof Reply]>
export const isReply = replies.check.bind(replies)

export const actions = z.union([
  Schema.action.classify,
  Schema.action.addClassification,
  Schema.action.flush,
  Schema.action.gc,
  Schema.action.train,
  Schema.action.shutdown,
])
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  if ('topic' in action && isString(action.topic)) {
    return action as z.infer<typeof actions>
  }
  log(`Messages like the following will be deprecated ${inspect(action)}`)
  if (action.payload === 'flush') {
    return { topic: 'FLUSH.V1' as const, _msgid: action._msgid }
  }
  if (action.payload === 'garbage collection') {
    return { topic: 'GARBAGE_COLLECTION.V1' as const, _msgid: action._msgid }
  }
  if (action.payload === 'train') {
    return { topic: 'TRAIN.V1' as const, _msgid: action._msgid }
  }
  if (action.payload === 'document') {
    return { payload: action, topic: 'ADD_CLASSIFICATION.V1' as const, _msgid: action._msgid }
  }
  return { payload: action, topic: 'CLASSIFY.V1' as const, _msgid: action._msgid }
}

export const Event = {
  message(
    args: Omit<z.infer<typeof Schema.event.classified>, 'topic'>['payload'],
  ): z.infer<typeof Schema.event.classified> {
    return { topic: 'CLASSIFIED.V1' as const, payload: args }
  },
}

export const events = Schema.event.classified
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
