import { parseDate } from 'chrono-node'
import * as z from 'zod'

const Message = z.object({ _msgid: z.string() })

const UnscheduledVariationSchema = z.object({
  id: z
    .string()
    .optional()
    .transform((it) => {
      return (it?.trim().length ?? 0) > 0 ? it!.trim() : generateId()
    }),
  type: z
    .literal('unscheduled-variation')
    .optional()
    .transform((it) => {
      return it ?? ('unscheduled-variation' as const)
    }),
  text: z.string().nonempty(),
  images: z
    .array(
      z
        .string()
        .transform((it) => {
          try {
            return new URL(it).toString()
          } catch {
            return ''
          }
        })
        .refine((it) => it.length > 0),
    )
    .max(4),
  publishedAt: z
    .null()
    .optional()
    .transform((it) => null),
  scheduleAt: z
    .null()
    .optional()
    .transform((it) => null),
  tweetId: z
    .null()
    .optional()
    .transform((it) => null),
})

const ScheduleVariationSchema = UnscheduledVariationSchema.extend({
  type: z.literal('scheduled-variation'),
  scheduleAt: z
    .string()
    .transform((it) => (parseDate(it) as Date | null)?.toISOString() ?? '')
    .refine((it) => it?.length > 0),
})

const PublishedVariationSchema = ScheduleVariationSchema.extend({
  type: z.literal('published-variation'),
  scheduleAt: z
    .null()
    .optional()
    .transform((it) => null),
  publishedAt: z
    .string()
    .transform((it) => (parseDate(it) as Date | null)?.toISOString() ?? '')
    .refine((it) => it?.length > 0),
  tweetId: z
    .string()
    .optional()
    .transform((it) => it?.trim() ?? '')
    .refine((it) => it.length > 0),
})

export type ScheduledVariation = z.output<typeof ScheduleVariationSchema>
export type UnscheduledVariation = z.output<typeof UnscheduledVariationSchema>
export type PublishedVariation = z.output<typeof PublishedVariationSchema>

export function isPublishedVariation(item: unknown): item is PublishedVariation {
  return PublishedVariationSchema.safeParse(item).success
}

export function isScheduledVariation(item: unknown): item is PublishedVariation {
  return ScheduleVariationSchema.safeParse(item).success
}

export const AnyVariationSchema = z.union([
  UnscheduledVariationSchema,
  ScheduleVariationSchema,
  PublishedVariationSchema,
])

const Schema = {
  tweet: Message.extend({
    topic: z.literal('QUEUE.V1'),
    payload: z.object({
      id: z
        .string()
        .optional()
        .transform((it) => {
          return (it?.trim().length ?? 0) > 0 ? it?.trim() : undefined
        }),
      variations: z.array(AnyVariationSchema).min(1),
      createdAt: z
        .string()
        .optional()
        .transform((it) => {
          return (parseDate(it ?? '') as Date | null)?.toISOString() ?? undefined
        }),
    }),
  }),
  tick: Message.extend({
    topic: z.literal('TICK.V1'),
    payload: z.number(),
  }),
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  reschedule: Message.extend({
    topic: z.literal('RESCHEDULE_ALL.V1'),
  }),
  published: Message.extend({
    topic: z.literal('PUBLISHED.V1'),
    payload: z.object({
      tweetId: z.string().nonempty(),
      id: z.string().nonempty(),
    }),
  }),
  gc: Message.extend({
    topic: z.literal('GARBAGE_COLLECTION.V1'),
    payload: z.number(),
  }),
  dump: Message.extend({
    topic: z.literal('DUMP.V1'),
  }),
  publish: z.object({
    topic: z.literal('PUBLISH.V1'),
    payload: z.object({
      id: z.string().nonempty(),
      text: z.string().nonempty(),
      images: z.array(z.string().url()).max(4),
    }),
  }),
  state: z.object({
    topic: z.literal('STATE.V1'),
    payload: z.object({
      tweets: z.array(
        z.object({
          id: z.string().nonempty(),
          variations: z.array(AnyVariationSchema),
          createdAt: z.string().nonempty(),
        }),
      ),
    }),
  }),
}

export const actions = z.union([
  Schema.tweet,
  Schema.tick,
  Schema.flush,
  Schema.reschedule,
  Schema.published,
  Schema.gc,
  Schema.dump,
])
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  publish(args: Omit<z.infer<typeof Schema.publish>, 'topic'>['payload']): z.infer<typeof Schema.publish> {
    return { topic: 'PUBLISH.V1' as const, payload: args }
  },
  state(args: Omit<z.infer<typeof Schema.state>, 'topic'>['payload']): z.infer<typeof Schema.state> {
    return { topic: 'STATE.V1' as const, payload: args }
  },
}

export const events = Schema.publish
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

function generateId() {
  return `${Date.now()}-${uuid()}`
}

function uuid() {
  return Math.random().toString(36).substring(7)
}
