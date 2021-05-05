import humanInterval from 'human-interval'
import { Node } from 'node-red'
import RRule, { RRuleSet } from 'rrule'
import { AsyncContext } from '../context'
import { Actions, Events, Event } from './smarterqueue.common'

export interface Tweet {
  id: string
  createdAt: string
  variations: Record<string, UnscheduledVariation | ScheduledVariation | PublishedVariation>
}

interface ScheduledVariation {
  type: 'scheduled-variation'
  id: string
  text: string
  images: string[]
  publishedAt: null
  tweetId: null
  scheduleAt: string
}

interface UnscheduledVariation {
  type: 'unscheduled-variation'
  id: string
  text: string
  images: string[]
  publishedAt: null
  tweetId: null
  scheduleAt: null
}

interface PublishedVariation {
  type: 'published-variation'
  id: string
  text: string
  images: string[]
  publishedAt: string
  tweetId: string
  scheduleAt: null
}

export function Setup({
  node,
  context,
  rrule,
  circuitBreakerMaxEmit,
  newDate,
}: {
  node: Node
  context: AsyncContext
  rrule: RRule | RRuleSet
  circuitBreakerMaxEmit: number
  newDate: () => Date
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        const keys = await context.keys()
        for (const key of keys) {
          await context.set(key)
        }
        node.status({})
        return done()
      }
      case 'QUEUE.V1': {
        const id = generateId()

        await context.set<Tweet>(id, {
          id,
          variations: action.payload.variations.reduce((acc, it) => {
            const id = generateId()
            return {
              ...acc,
              [id]: <UnscheduledVariation>{
                type: 'unscheduled-variation' as const,
                id,
                text: it.text,
                images: it.images,
                publishedAt: null,
                tweetId: null,
                scheduleAt: null,
              },
            }
          }, {} as Record<string, UnscheduledVariation>),
          createdAt: new Date().toISOString(),
        })

        node.status({ fill: 'green', shape: 'dot', text: `Added tweet ${id} ${time()}` })
        return done()
      }
      case 'PUBLISHED.V1': {
        if (!/#/.test(action.payload.id)) {
          node.error(`Invalid id ${action.payload.id}. Expected #.`)
          return done()
        }

        const [internalTweetId, variationId] = action.payload.id.split('#') as [string, string]
        const tweet = await context.get<Tweet>(internalTweetId)

        if (!tweet) {
          node.error(`Published an unknown tweet with id ${action.payload.tweetId} (internal id: ${internalTweetId})`)
          node.status({ fill: 'red', shape: 'dot', text: `Published unknown tweet ${internalTweetId} ${time()}` })
          return done()
        }

        const currentVariation = tweet.variations[variationId]

        if (!currentVariation) {
          node.error(`Published an unknown tweet with variation id ${variationId}`)
          node.status({
            fill: 'red',
            shape: 'dot',
            text: `Published unknown tweet with variation ${variationId} ${time()}`,
          })
          return done()
        }

        const newTweet = {
          ...tweet,
          variations: {
            ...tweet.variations,
            [variationId]: publishVariation(currentVariation, action.payload.tweetId, node),
          },
        }

        await context.set(internalTweetId, newTweet)

        if (Object.values(newTweet.variations).every((it) => it.type === 'published-variation')) {
          node.log(`Published all ${Object.values(newTweet.variations).length} variations for tweet ${internalTweetId}`)
        } else {
          node.log(`Published variation ${variationId} for tweet ${internalTweetId}`)
        }

        node.status({
          fill: 'green',
          shape: 'dot',
          text: `Tweet published ${newTweet.id} ${time()}`,
        })

        return done()
      }
      case 'RESCHEDULE_ALL.V1': {
        const keys = await filterPublished(await context.keys()).then((keys) => {
          return keys.sort((a, b) => a.date.valueOf() - b.date.valueOf()).map((it) => it.id)
        })

        let counter = 0
        let previousDate = newDate()

        for (const key of keys) {
          const tweet = await context.get<Tweet>(key)

          if (!tweet) {
            continue
          }

          const firstValidVariation = Object.values(tweet.variations).find((it) => !isPublishedVariation(it)) as
            | UnscheduledVariation
            | ScheduledVariation

          const previousScheduledTime = firstValidVariation.publishedAt
          const nextSlot = rrule.after(previousDate)

          previousDate = nextSlot

          await context.set<Tweet>(key, {
            ...tweet,
            variations: {
              ...tweet.variations,
              [firstValidVariation.id]: scheduleVariation(firstValidVariation, nextSlot, node),
            },
          })
          counter++

          node.log(`Rescheduled tweet ${key} from ${previousScheduledTime ?? 'no slot'} to ${nextSlot}`)
        }

        node.status({ fill: 'green', shape: 'dot', text: `Reschedule ${counter} tweets. ${time()}` })
        return done()

        async function filterPublished(keys: string[]): Promise<{ id: string; date: Date }[]> {
          return keys.reduce(async (acc, it) => {
            const tweet = await context.get<Tweet>(it)

            if (!tweet) {
              return acc
            }

            const firstValidVariation = Object.values(tweet.variations).find((it) => !isPublishedVariation(it)) as
              | UnscheduledVariation
              | ScheduledVariation
              | undefined

            if (!firstValidVariation) {
              return acc
            }

            const lastPublishedVariation = (Object.values(tweet.variations).filter((it) =>
              isPublishedVariation(it),
            ) as PublishedVariation[]).sort((a, b) => b.publishedAt?.localeCompare(a.publishedAt))[0] as
              | PublishedVariation
              | undefined

            return acc.then((acc) => [
              ...acc,
              { id: it, date: new Date(lastPublishedVariation?.publishedAt ?? tweet.createdAt) },
            ])
          }, Promise.resolve<{ id: string; date: Date }[]>([]))
        }
      }
      case 'TICK.V1': {
        const keys = await context.keys()
        let counter = 0

        for (const key of keys) {
          const tweet = await context.get<Tweet>(key)

          if (!tweet) {
            continue
          }

          const scheduledVariations = Object.values(tweet.variations).filter((it) =>
            isScheduledVariation(it),
          ) as ScheduledVariation[]

          if (scheduledVariations.length === 0) {
            continue
          }

          for (const variation of scheduledVariations) {
            if (action.payload > new Date(variation.scheduleAt).valueOf()) {
              if (counter > circuitBreakerMaxEmit) {
                node.warn(`Already published too many tweets. Shortcircuit enganged.`)
              } else {
                send(
                  Event.publish({ text: variation.text, images: variation.images, id: `${tweet.id}#${variation.id}` }),
                )
                node.log(`Published variation ${variation.id} for tweet ${tweet.id}`)
                node.status({ fill: 'green', shape: 'dot', text: `Published tweet ${tweet.id}. ${time()}` })
                counter++
              }
            }
          }
        }

        return done()
      }
      case 'GARBAGE_COLLECTION.V1': {
        const keys = await context.keys()
        let counter = 0

        for (const key of keys) {
          const tweet = await context.get<Tweet>(key)

          if (!tweet) {
            continue
          }

          const hasVariations = Object.values(tweet.variations).length > 0
          const isComplete = Object.values(tweet.variations).every((it) => isPublishedVariation(it))

          function mostRecentPublish(variations: PublishedVariation[]): Date {
            return new Date(
              variations.sort(
                (a, b) => new Date(b.publishedAt!).valueOf() - new Date(a.publishedAt!).valueOf(),
              )[0]!.publishedAt,
            )
          }

          if (
            hasVariations &&
            isComplete &&
            action.payload - mostRecentPublish(Object.values(tweet.variations) as PublishedVariation[]).valueOf() >=
              humanInterval('1 month')!
          ) {
            await context.set(tweet.id)
            counter++
          }
        }

        node.log(`Purged ${counter} tweets`)
        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}

function generateId() {
  return `${Date.now()}-${uuid()}`
}

function uuid() {
  return Math.random().toString(36).substring(7)
}

function isScheduledVariation(
  variation: UnscheduledVariation | ScheduledVariation | PublishedVariation,
): variation is ScheduledVariation {
  return variation.type === 'scheduled-variation'
}

function isUnscheduledVariation(
  variation: UnscheduledVariation | ScheduledVariation | PublishedVariation,
): variation is UnscheduledVariation {
  return variation.type === 'unscheduled-variation'
}

function isPublishedVariation(
  variation: UnscheduledVariation | ScheduledVariation | PublishedVariation,
): variation is PublishedVariation {
  return variation.type === 'published-variation'
}

function scheduleVariation(
  variation: UnscheduledVariation | ScheduledVariation | PublishedVariation,
  at: Date,
  node: Node,
): ScheduledVariation | PublishedVariation {
  const scheduledVariation = {
    ...variation,
    type: 'scheduled-variation' as const,
    scheduleAt: at.toISOString(),
    tweetId: null,
    publishedAt: null,
  }

  switch (variation.type) {
    case 'published-variation':
      node.warn(`Scheduled an already published variation ${variation.id}. Skipping.`)
      return variation
    case 'scheduled-variation':
      node.warn(`Scheduled an already scheduled variation ${variation.id}. Before ${variation.scheduleAt}, now ${at}.`)
      return scheduledVariation
    case 'unscheduled-variation':
      return scheduledVariation
    default:
      throw new Error('I did not expect this')
  }
}

function publishVariation(
  variation: UnscheduledVariation | ScheduledVariation | PublishedVariation,
  tweetId: string,
  node: Node,
): PublishedVariation {
  const publishedVariation = {
    ...variation,
    type: 'published-variation' as const,
    scheduleAt: null,
    tweetId,
    publishedAt: new Date().toISOString(),
  }

  switch (variation.type) {
    case 'published-variation':
      if (variation.tweetId === tweetId) {
        // this is a duplicate message
        return variation
      } else {
        node.warn(
          `Published an already published variation ${variation.id} with Twitter id ${tweetId}. Previous Tweet id was ${variation.tweetId}`,
        )
        return publishedVariation
      }
    case 'unscheduled-variation':
      node.warn(`Published an unscheduled variation ${variation.id} with Twitter id ${tweetId}`)
      return publishedVariation
    case 'scheduled-variation':
      return publishedVariation
    default:
      throw new Error('I did not expect this')
  }
}
