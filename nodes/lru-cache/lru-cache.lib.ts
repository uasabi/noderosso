import { AsyncContext } from '../context'
import { Node } from 'node-red'
import { Actions, Item, isItem, Event, Events } from './lru-cache.common'

export function Setup({
  context,
  ttl,
  node,
  dedupeField,
}: {
  context: AsyncContext
  ttl: number
  node: Node
  dedupeField?: string
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
      case 'TICK.V1': {
        const keys = await context.keys()
        for (const key of keys) {
          const item = await context.get<Item>(key)
          if (!isItem(item)) {
            node.error(`Invalid key ${key} detect. Deleting...`)
            await context.set(key)
            continue
          }
          const { value, time } = item
          if (Date.now() - time > ttl) {
            send(Event.expired(value))
            await context.set(key)
          }
        }
        return done()
      }
      case 'SET.V1': {
        if (dedupeField) {
          const keys = await context.keys()
          for (const key of keys) {
            const item = await context.get<Item>(key)
            if ((item?.value as any)[dedupeField] === action.payload[dedupeField]) {
              return done()
            }
          }
        }

        await context.set(uuid(), { time: Date.now(), value: action.payload })
        node.status({ fill: 'green', shape: 'dot', text: `Last added ${action._msgid} ${time()}` })
        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
}

function uuid() {
  return Math.random().toString(36).substring(7)
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}
