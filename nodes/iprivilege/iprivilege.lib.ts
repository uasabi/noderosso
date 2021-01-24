import { Node } from 'node-red'
import { AsyncContext } from '../context'
import { Actions, Events, Event } from './iprivilege.common'
import { axios, prettyAxiosErrors, AxiosResponse } from '../axios'
import querystring from 'querystring'
import { add, isBefore, sub, format } from 'date-fns'
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

          if (!booking.booked) {
            await context.set(key)
            continue
          }

          const sessionId = await createSession({ email, password, propertyId })

          if (sessionId instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(`Error while creating a session:\n[${sessionId.name}]: ${sessionId.message}`)
            send(Event.failedBooking({ date: booking.date }))
            continue
          }

          const isCancelled = await cancelBooking({ sessionId, bookingId: booking.externalBookingId! })

          if (isCancelled instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(`Error while cancelling a booking:\n[${isCancelled.name}]: ${isCancelled.message}`)
            continue
          }

          await context.set(key)
        }
        return done()
      }
      case 'TICK.V1': {
        const facilityId = 'dc49caa7-bbe3-4031-8757-fd3a574664a8'
        const facilityName = 'Tennis Court'

        const keys = await context.keys()
        for (const key of keys) {
          const booking = await context.get<Booking>(key)

          if (!booking) {
            continue
          }

          if (booking.booked || isBefore(new Date(booking.date), sub(new Date(), { days: 7 }))) {
            continue
          }

          const sessionId = await createSession({ email, password, propertyId })

          if (sessionId instanceof Error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(`Error while creating a session:\n[${sessionId.name}]: ${sessionId.message}`)
            send(Event.failedBooking({ date: booking.date }))
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
            node.error(`Error while submitted the booking:\n[${bookingId.name}]: ${bookingId.message}`)
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
      not200: () => new InvalidCredentials('Invalid credentials'),
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

  console.log(
    'https://iprivilege.kfpam.com.sg/Home/NewFacilityBooking',
    {
      id: facilityId,
      name: facilityName,
      ts: `${formatDate(startingDatetime)} - ${formatDate(add(startingDatetime, { hours: 1 }))},0.00,r`,
      d: format(startingDatetime, `d/LLL/yyyy '00:00:00'`),
      invoiceNo: format(new Date(), `'395f754a'yyMMddhhmmss`), // 395f754a fixed, YYMMDDHHMMSS
      amount: '0.00',
      paymentMethod: 'CA',
      paymentMethod2: 'CA',
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
    },
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `ASP.NET_SessionId=${sessionId}` } },
  )

  let response: AxiosResponse
  try {
    response = await axios.post<string | 1>(
      'https://iprivilege.kfpam.com.sg/Home/NewFacilityBooking',
      querystring.stringify({
        id: facilityId,
        name: facilityName,
        r: undefined,
        ts: `${formatDate(startingDatetime)} - ${formatDate(add(startingDatetime, { hours: 1 }))},0.00,r`,
        d: format(startingDatetime, `d/LLL/yyyy '00:00:00'`),
        invoiceNo: format(new Date(), `'395f754a'yyMMddhhmmss`), // 395f754a fixed, YYMMDDHHMMSS
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
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `ASP.NET_SessionId=${sessionId}` } },
    )
  } catch (error) {
    return prettyAxiosErrors(error)({
      not200: () => new SessionExpired('Did not receive a successful response while booking'),
      noResponse: () => new GenericError('no response'),
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

  try {
    response = await axios.post<0 | 1>(
      'https://iprivilege.kfpam.com.sg/Home/CancelBooking',
      querystring.stringify({
        id: bookingId,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `ASP.NET_SessionId=${sessionId}` } },
    )
  } catch (error) {
    return prettyAxiosErrors(error)({
      not200: () => new SessionExpired('Did not receive a successful response while booking'),
      noResponse: () => new GenericError('no response'),
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
