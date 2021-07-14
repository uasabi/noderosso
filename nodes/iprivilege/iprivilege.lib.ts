import { Node } from 'node-red'
import { AsyncContext } from '@noderosso/packages/context'
import { Actions, Events, Event } from './iprivilege.common'
import { axios, prettyAxiosErrors, AxiosResponse } from '@noderosso/packages/axios'
import querystring from 'querystring'
import { add, sub, format, startOfDay } from 'date-fns'
import * as chrono from 'chrono-node'

export function Setup({
  context,
  node,
  email,
  password,
  propertyId,
  userId,
}: {
  context: AsyncContext
  node: Node
  email: string
  password: string
  userId: string
  propertyId: string
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        try {
          const keys = await context.keys()
          for (const key of keys) {
            await context.set(key)
          }
        } catch {}
        return done()
      }
      case 'BOOK.V1': {
        const startDatetime = chrono.parseDate(action.payload.date) as Date | null
        if (!startDatetime) {
          node.warn(`Ignoring invalid date ${action.payload.date}`)
          return done()
        }
        const id = uuid()
        await context.set<Booking>(id, { id, date: startDatetime.toISOString(), booked: false })
        return done()
      }
      case 'CANCEL.V1': {
        const keys = await context.keys()
        for (const key of keys) {
          const booking = await context.get<Booking>(key)

          if (!booking || key !== action.payload.bookingId) {
            continue
          }

          const isPastBooking = startOfDay(new Date(booking.date)).valueOf() < startOfDay(nowInSgt()).valueOf()

          if (!booking.booked || isPastBooking) {
            await context.set(key)
            continue
          }

          const sessionId = await createSession({ email, password, propertyId })

          if (sessionId instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(
              [
                `Error while creating a session for ${booking.date} (${booking.id}).`,
                `[${sessionId.name}]: ${sessionId.message}`,
              ].join('\n'),
            )
            send(Event.failedBooking({ date: booking.date }))
            continue
          }

          const isCancelled = await cancelBooking({ sessionId, bookingId: booking.externalBookingId! })

          if (isCancelled instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(
              [
                `Error while cancelling a booking for ${booking.date} (${booking.id}).`,
                `[${isCancelled.name}]: ${isCancelled.message}`,
              ].join('\n'),
            )
            continue
          }

          await context.set(key)
        }
        return done()
      }
      case 'TICK.V1': {
        const facilityId = 'dc49caa7-bbe3-4031-8757-fd3a574664a8'
        const facilityName = 'Tennis Court'

        let sessionId: string | null | LoginError | InvalidCredentials = null

        const keys = await context.keys()
        for (const key of keys) {
          const booking = await context.get<Booking>(key)

          if (!booking) {
            continue
          }

          if (booking.booked) {
            continue
          }

          const isTooFarInTheFuture =
            sub(startOfDay(new Date(booking.date)), { days: 7 }).valueOf() > startOfDay(nowInSgt()).valueOf()
          if (isTooFarInTheFuture) {
            continue
          }

          if (!sessionId) {
            sessionId = await createSession({ email, password, propertyId })
          }

          if (sessionId instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(
              [
                `Error while the session for ${booking.date} (${booking.id}).`,
                `[${sessionId.name}]: ${sessionId.message}`,
              ].join('\n'),
            )
            send(Event.failedBooking({ date: booking.date }))
            sessionId = null
            continue
          }

          const bookingId = await bookCourt({
            sessionId,
            userId,
            startingDatetime: new Date(booking.date),
            facilityId,
            facilityName,
          })

          if (bookingId instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(
              [
                `Error while submitting the booking for ${booking.date} (${booking.id}).`,
                `[${bookingId.name}]: ${bookingId.message}`,
              ].join('\n'),
            )
            send(Event.failedBooking({ date: booking.date }))
            continue
          }

          await context.set<Booking>(key, { ...booking, externalBookingId: bookingId, booked: true })
          send(Event.confirmedBooking({ date: booking.date }))
          node.status({ fill: 'green', shape: 'dot', text: `Booked ${booking.date} ${time()}` })
        }
        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
}

function nowInSgt() {
  return add(new Date(), { hours: 8 }) // SGT
}

interface Booking {
  id: string
  date: string
  booked: boolean
  externalBookingId?: string
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}

async function createSession({
  email,
  password,
  propertyId,
}: {
  email: string
  password: string
  propertyId: string
}): Promise<string | LoginError | InvalidCredentials> {
  let response: AxiosResponse
  try {
    response = await axios.post<0 | 1>(
      'https://iprivilege.kfpam.com.sg/Public/LogIn',
      querystring.stringify({
        userName: email,
        pass: password,
        pId: propertyId,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
  } catch (error) {
    return prettyAxiosErrors(error)({
      noResponse: () => new GenericError('No response'),
      not200: (response) =>
        new InvalidCredentials(
          `Invalid credentials. Received ${response.status} but I was expecting a 200. Response:\n${response.data}`,
        ),
      orElse: () => new GenericError('Unknown error while connecting'),
    })
  }

  if (response.data !== 0) {
    return new InvalidCredentials('Invalid credentials')
  }

  const setCookie: string | string[] = response.headers['set-cookie'] ?? ''
  const cookieMatches = (Array.isArray(setCookie) ? setCookie.join(';') : setCookie).match(/ASP.NET_SessionId=(.*?);/i)
  const cookieId = cookieMatches ? cookieMatches[1] ?? undefined : undefined

  if (!cookieId) {
    return new LoginError('Could not find the cookie')
  }

  return cookieId
}

class LoginError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LoginError'
  }
}

class GenericError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GenericError'
  }
}

class InvalidCredentials extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCredentials'
  }
}

class SessionExpired extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionExpired'
  }
}

class InvalidBooking extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBooking'
  }
}

async function bookCourt({
  sessionId,
  userId,
  startingDatetime,
  facilityId,
  facilityName,
}: {
  sessionId: string
  userId: string
  startingDatetime: Date
  facilityId: string
  facilityName: string
}): Promise<string | SessionExpired | GenericError | InvalidBooking> {
  const formatDate = (date: Date) => {
    return format(date, `HH:'00'`)
  }

  const url = 'https://iprivilege.kfpam.com.sg/Home/NewFacilityBooking'
  const payload = {
    id: facilityId,
    name: facilityName,
    r: undefined,
    ts: `${formatDate(startingDatetime)} - ${formatDate(add(startingDatetime, { hours: 1 }))},0.00,r`,
    d: format(startingDatetime, `dd/LLL/yyyy '00:00:00'`),
    invoiceNo: format(nowInSgt(), `'395f754a'yyMMddhhmmss`), // 395f754a fixed, YYMMDDHHMMSS
    refNo: undefined,
    amount: '0.00',
    paymentMethod: 'CA',
    paymentMethod2: 'CA',
    refNo2: undefined,
    type: 'r',
    q: 4,
    qp: 0,
    ti: 'w',
    tip: 'd',
    tit: 't',
    ft: 'tc',
    l: 1,
    bookedfor: userId,
    dp: '0.00',
    tf: '0.00',
    admf: '0.00',
    IsCon: 'N',
    ServiceCharges: undefined,
  }

  let response: AxiosResponse
  try {
    response = await axios.post<string | 1>(url, querystring.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `ASP.NET_SessionId=${sessionId}` },
    })
  } catch (error) {
    return prettyAxiosErrors(error)({
      not200: (response) =>
        new SessionExpired(
          [
            `I did not receive a successful response while booking. Expected 200, received ${response.status}.`,
            `POST ${url} and sessionId ${sessionId}\n${querystring.stringify(payload)}`,
            `Response: ${response.data}`,
          ].join('\n'),
        ),
      noResponse: () => new GenericError('Timeout'),
      orElse: () => new GenericError('Unknown error while connecting'),
    })
  }

  if (response.data === 1) {
    return new InvalidBooking('Error when booking')
  }

  return response.data
}

async function cancelBooking({
  sessionId,
  bookingId,
}: {
  sessionId: string
  bookingId: string
}): Promise<boolean | SessionExpired | GenericError | InvalidBooking> {
  let response: AxiosResponse

  const url = 'https://iprivilege.kfpam.com.sg/Home/CancelBooking'
  const payload = {
    id: bookingId,
  }

  try {
    response = await axios.post<0 | 1>(url, querystring.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `ASP.NET_SessionId=${sessionId}` },
    })
  } catch (error) {
    return prettyAxiosErrors(error)({
      not200: (response) =>
        new SessionExpired(
          [
            `I did not receive a successful response while cancelling a booking. Expected 200, received ${response.status}.`,
            `POST ${url} and sessionId ${sessionId}\n${querystring.stringify(payload)}`,
            `Response: ${response.data}`,
          ].join('\n'),
        ),
      noResponse: () => new GenericError('Timed out'),
      orElse: () => new GenericError('Unknown error while connecting'),
    })
  }

  if (response.data !== 0) {
    return new InvalidBooking('The booking does not exist or ... ?')
  }

  return true
}

function uuid() {
  return Math.random().toString(36).substring(7)
}
