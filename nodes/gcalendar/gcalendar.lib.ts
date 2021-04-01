import { Node } from 'node-red'
import { Actions, Events } from './gcalendar.common'
import { google, Auth } from 'googleapis'
import { set, getYear, getMonth, getDate, add, sub } from 'date-fns'
import { inspect } from 'util'
import { parseDate } from 'chrono-node'

export function Setup({ node, auth }: { node: Node; auth: Auth.OAuth2Client }) {
  const client = google.calendar({ version: 'v3', auth })

  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'LIST_CALENDARS.V1': {
        try {
          node.log(
            ((await client.calendarList.list()).data.items || [])
              .map((it) => {
                if (it.description) {
                  return `[${it.id}] ${it.summary} — ${it.description}`
                } else {
                  return `[${it.id}] ${it.summary}`
                }
              })
              .join('\n'),
          )
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          node.error(inspect(error))
        }
        return done()
      }

      case 'UPDATE_REMINDERS.V1': {
        const now = isString(action.payload.now)
          ? parseDate(action.payload.now) ?? new Date()
          : new Date(action.payload.now)
        const calendarId = action.payload.calendarId
        const before = parseDate(action.payload.before ?? '') ?? undefined
        const after = parseDate(action.payload.after ?? '') ?? undefined
        const query = action.payload.query ?? 'REMINDER'

        const events =
          (
            await client.events.list({
              calendarId,
              singleEvents: true,
              q: query,
              timeZone: 'UTC',
              timeMax: (before ?? now).toISOString(),
              timeMin: (after ?? sub(before ?? now, { weeks: 1 })).toISOString(),
            })
          ).data.items || []

        let updatedCount = 0
        for (const event of events) {
          if (!isString(event.id) || !event.summary?.startsWith(query)) {
            continue
          }

          const eventStart = parseDate(event.start?.dateTime ?? event.start?.date ?? '') as Date | null

          if (!eventStart) {
            node.warn(`Event ${event.summary} has no start date`)
            continue
          }

          node.log(`Updating event "${event.summary}" for calendar ${calendarId}`)

          const eventEnd = parseDate(event.end?.dateTime ?? event.end?.date ?? '') as Date | null
          const duration = eventEnd ? eventEnd.valueOf() - eventStart.valueOf() : undefined
          const newStartDate = set(eventStart, {
            year: getYear(now),
            month: getMonth(now),
            date: getDate(now),
          })

          try {
            const updateResponse = await client.events.patch({
              calendarId,
              eventId: event.id,
              requestBody: {
                start: {
                  dateTime: newStartDate.toISOString(),
                  timeZone: event.start?.timeZone ?? 'UTC',
                },
                ...(duration
                  ? {
                      end: {
                        dateTime: add(newStartDate, { seconds: Math.round(duration / 1000) }).toISOString(),
                        timeZone: event.end?.timeZone ?? 'UTC',
                      },
                    }
                  : {}),
              },
            })
            if (updateResponse.status < 200 || updateResponse.status >= 300) {
              node.error(`Could not update ${event.summary}: ${updateResponse.statusText}`)
              node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            } else {
              updatedCount += 1
              node.status({ fill: 'green', shape: 'dot', text: `Updated ${event.summary} ${time()}` })
              node.log(`Update succeeded to start time: ${newStartDate.toISOString()} ${updateResponse.statusText}`)
            }
          } catch (error) {
            node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
            node.error(inspect(error))
          }
        }
        node.log(`Updated ${updatedCount} reminders for ${calendarId}`)
        return done()
      }

      case 'CREATE_EVENT.V1': {
        const startDate = parseDate(action.payload.startingAt) as Date | null

        if (!startDate) {
          node.warn('Cannot create an event without a valid date')
          return done()
        }

        const endDate = (parseDate(action.payload.endingAt ?? '') as Date | null) ?? add(startDate, { minutes: 30 })
        const timezone = action.payload.timezone ?? 'UTC'

        try {
          await client.events.insert({
            calendarId: action.payload.calendarId,
            requestBody: {
              start: {
                dateTime: startDate.toISOString(),
                timeZone: timezone,
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: timezone,
              },
              summary: action.payload.summary,
            },
          })
          node.log(`Created event ${action.payload.summary} in ${action.payload.calendarId}`)
          node.status({ fill: 'green', shape: 'dot', text: `Event created ${time()}` })
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          node.error(inspect(error))
        }

        return done()
      }

      default:
        return done()
    }
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function time() {
  return new Date().toISOString().substr(11, 5)
}
