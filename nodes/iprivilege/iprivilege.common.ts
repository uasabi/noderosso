import * as z from 'zod'
import { inspect } from 'util'

const Message = z.object({ _msgid: z.string() })

const Schema = {
  flush: Message.extend({
    topic: z.literal('FLUSH.V1'),
  }),
  tick: Message.extend({
    topic: z.literal('TICK.V1'),
  }),
  book: Message.extend({
    topic: z.literal('BOOK.V1'),
    payload: z.object({
      date: z.string().nonempty(),
    }),
  }),
  cancel: Message.extend({
    topic: z.literal('CANCEL.V1'),
    payload: z.object({
      bookingId: z.string().nonempty(),
    }),
  }),
  confirmedBooking: z.object({
    topic: z.literal('CONFIRMED_BOOKING.V1'),
    payload: z.object({
      date: z.string().nonempty(),
    }),
  }),
  failedBooking: z.object({
    topic: z.literal('FAILED_BOOKING.V1'),
    payload: z.object({
      date: z.string().nonempty(),
    }),
  }),
}

export const actions = z.union([Schema.flush, Schema.tick, Schema.book, Schema.cancel])
export type Actions = z.infer<typeof actions>
export function isAction(action: unknown): action is Actions {
  return actions.safeParse(action).success
}
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const Event = {
  confirmedBooking(
    args: Omit<z.infer<typeof Schema.confirmedBooking>, 'topic'>['payload'],
  ): z.infer<typeof Schema.confirmedBooking> {
    return { topic: 'CONFIRMED_BOOKING.V1' as const, payload: args }
  },
  failedBooking(
    args: Omit<z.infer<typeof Schema.failedBooking>, 'topic'>['payload'],
  ): z.infer<typeof Schema.failedBooking> {
    return { topic: 'FAILED_BOOKING.V1' as const, payload: args }
  },
}

export const events = z.union([Schema.confirmedBooking, Schema.failedBooking])
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export function isEvent(event: unknown): event is Events {
  return events.safeParse(event).success
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
