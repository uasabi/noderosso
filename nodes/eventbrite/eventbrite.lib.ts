import { Node } from 'node-red'
import { Actions, Events } from './eventbrite.common'
import { AxiosInstance } from 'axios'
import hastParser from 'hast-util-raw'
import { selectAll } from 'hast-util-select'
import toString from 'hast-util-to-string'

type SimplifiedEvent = {
  id: string
  courseId?: string
  description: string
  pageVersion: number
  summary: string | null
  startsAt: string
  endsAt: string
  timezone: string
  isLive: boolean
}

export function Setup({
  node,
  eventId,
  organizationId,
  axios,
}: {
  node: Node
  eventId: string
  organizationId: string
  axios: AxiosInstance
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'EVENT.V1': {
        if (new Date(action.payload.startsAt).valueOf() > Date.now()) {
          node.log(`The event ${action.payload.id} is in the past. Skipping.`)
          return done()
        }

        const { data: allEvents } = await getAllEvent({ organizationId })
        const eventbriteEventWithIds = await Promise.all(
          allEvents.events.map(async (it) => {
            const { data: content } = await getStructuredContent({ eventId: it.id })

            const description = content.modules[0]?.data?.body?.text ?? ''
            const hast = parseHtml(description)
            const courseId = selectAll('em', hast).find((it) => {
              return toString(it).startsWith('LK8S|')
            })
            return {
              id: it.id,
              courseId: courseId ? toString(courseId) : undefined,
              description,
              summary: it.description.html,
              pageVersion: parseInt(content.page_version_number),
              startsAt: it.start.utc,
              timezone: it.start.timezone,
              endsAt: it.end.timezone,
              isLive: true,
            } as SimplifiedEvent
          }),
        )
        let eventbriteEvent = eventbriteEventWithIds.find((it) => it.courseId === action.payload.id)

        if (!eventbriteEvent) {
          node.log(`Event ${action.payload.id} not found. Creating a new one...`)
          eventbriteEvent = await onNewEvent({
            courseId: action.payload.id,
            eventId,
            price: action.payload.price,
            endsAt: action.payload.startsAt,
          })
        } else {
          node.log(`Event ${action.payload.id} found`)
          await onExistinEvent()
        }

        if (action.payload.summary !== eventbriteEvent.summary) {
          node.log(`Summary for event ${eventbriteEvent.id} does not match. Updating...`)
          await onDifferentSummary(action.payload.summary, eventbriteEvent)
        }

        if (renderDescription(action.payload) !== eventbriteEvent.description) {
          node.log(`Description for event ${eventbriteEvent.id} does not match. Updating...`)
          await onDifferentDescription(renderDescription(action.payload), eventbriteEvent)
        }

        if (
          action.payload.timezone !== eventbriteEvent.timezone ||
          `${action.payload.startsAt}Z` === eventbriteEvent.startsAt ||
          `${action.payload.endsAt}Z` !== eventbriteEvent.endsAt
        ) {
          node.log(`Start and end date for event ${eventbriteEvent.id} do not match. Updating...`)
          await onDifferentDate(action.payload, eventbriteEvent)
        }

        if (!eventbriteEvent.isLive) {
          node.log(`Publishing the event ${eventbriteEvent.id}`)
          const response = await publishEvent({ eventId: eventbriteEvent.id })
          console.log(response.data)
        }

        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }

    async function onNewEvent({
      courseId,
      eventId,
      price,
      endsAt,
    }: {
      courseId: string
      eventId: string
      price: number
      endsAt: string
    }): Promise<SimplifiedEvent> {
      const responseCopyEvent = await copyEvent({ eventId })
      const newEventId = responseCopyEvent.data.id
      node.log(`A new event ${newEventId} was copied from ${eventId}.`)
      const { data: event } = await getSingleEvent({ eventId: newEventId })
      const ticketClassId = event.ticket_classes[0].id
      await updateTicket({
        eventId: newEventId,
        ticketClassId,
        cost: `${event.currency},${price}00`,
        endsAt: `${endsAt}Z`,
      })
      node.log(`Updated ticket class ${ticketClassId} for event ${newEventId}`)
      const { data: structuredContent } = await getStructuredContent({ eventId: newEventId })
      node.log(`Retrieved structured data content for event ${newEventId}`)
      return {
        id: event.id,
        summary: event.description.html ?? '',
        courseId,
        description: structuredContent.modules[0]?.data?.body?.text ?? '',
        pageVersion: parseInt(structuredContent.page_version_number),
        startsAt: event.start.utc,
        endsAt: event.end.utc,
        timezone: event.start.timezone,
        isLive: false,
      }
    }

    async function onExistinEvent(): Promise<void> {}

    async function onDifferentSummary(summary: string, event: SimplifiedEvent): Promise<void> {
      await genericEventUpdate({
        eventId,
        change: {
          description: {
            html: summary,
          },
        },
      })
    }

    async function onDifferentDescription(description: string, event: SimplifiedEvent): Promise<void> {
      await updateDescription({
        eventId: event.id,
        version: event.pageVersion + 1,
        description,
      })
    }

    async function onDifferentDate(
      { startsAt, endsAt, timezone }: { startsAt: string; endsAt: string; timezone: string },
      event: SimplifiedEvent,
    ): Promise<void> {
      await genericEventUpdate({
        eventId,
        change: {
          start: {
            utc: `${startsAt}Z`,
            timezone,
          },
          end: {
            utc: `${endsAt}Z`,
            timezone,
          },
        },
      })
    }
  }

  async function getAllEvent({ organizationId }: { organizationId: string }) {
    return await axios.get<ResponseEvents>(
      `/organizations/${organizationId}/events?expand=ticket_classes,venue&time_filter=current_future`,
    )
  }

  async function getStructuredContent({ eventId }: { eventId: string }) {
    return await axios.get<StructuredContent>(`/events/${eventId}/structured_content/`)
  }

  async function copyEvent({ eventId }: { eventId: string }) {
    return await axios.post<EventBriteCopyResponse>(`/events/${eventId}/copy/`)
  }

  async function getSingleEvent({ eventId }: { eventId: string }) {
    return await axios.get<EventEventBrite>(`/events/${eventId}?expand=ticket_classes,venue`)
  }

  async function updateDescription({
    eventId,
    version,
    description,
  }: {
    eventId: string
    version: number
    description: string
  }) {
    return await axios.post<unknown>(`/events/${eventId}/structured_content/${version}/`, {
      modules: [
        {
          data: {
            body: {
              alignment: 'left',
              text: description,
            },
          },
          type: 'text',
        },
      ],
      publish: true,
    })
  }

  async function genericEventUpdate({ eventId, change }: { eventId: string; change: Partial<EventEventBrite> }) {
    return axios.post<unknown>(`/events/${eventId}/`, { event: change })
  }

  async function publishEvent({ eventId }: { eventId: string }) {
    return await axios.post<{ published: boolean }>(`/events/${eventId}/publish/`)
  }

  async function updateTicket({
    eventId,
    ticketClassId,
    cost,
    endsAt,
  }: {
    eventId: string
    ticketClassId: string
    cost: string
    endsAt: string
  }) {
    return await axios.post<unknown>(`/events/${eventId}/ticket_classes/${ticketClassId}/`, {
      ticket_class: {
        cost,
        sales_end: endsAt,
      },
    })
  }

  function renderDescription({ description, id }: { description: string; id: string }) {
    return `${description}<p><br/><br/><br/>Course code:<em>${id}</em></p>`
  }
}

interface ResponseEvents {
  events: EventEventBrite[]
  pagination: {
    object_count: string
    page_number: string
    page_size: string
    page_count: string
    has_more_items: boolean
  }
}

interface EventEventBrite {
  name: Partial<{
    html: string
    text: string
  }>
  description: Partial<{
    html: string
    text: string
  }>
  id: string
  start: {
    timezone: string
    utc: string
  }
  end: {
    timezone: string
    utc: string
  }
  currency: string
  online_event: boolean
  listed: boolean
  shareable: boolean
  ticket_classes: {
    id: string
    cost: {
      value: number
    }
  }[]
  venue_id: string
  code?: string
  url: string
  organtization_id: string
  created: string
  changed: string
}

interface EventBriteCopyResponse {
  id: string
  end: {
    utc: string
  }
}

interface StructuredContent {
  page_version_number: string
  purpose: 'listing'
  modules: [TextModule]
}

interface TextModule {
  id: string
  type: 'text'
  data: {
    body: {
      text: string
      alignment: 'left'
    }
  }
}

function parseHtml(content?: string) {
  return hastParser({
    type: 'root',
    children: [
      { type: 'doctype', name: 'html' },
      { type: 'raw', value: content ?? '' },
    ],
  })
}
