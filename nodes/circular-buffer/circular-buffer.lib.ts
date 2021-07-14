import { AsyncContext } from '@noderosso/packages/context'
import { Node } from 'node-red'
import { Events, Event, Actions } from './circular-buffer.common'

export function Setup({
  context,
  maxSize,
  node,
  dedupeField,
  dispatchWhenIncomplete,
}: {
  context: AsyncContext
  maxSize: number
  node: Node
  dedupeField?: string
  dispatchWhenIncomplete: boolean
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

      case 'ADD.V1': {
        if (dedupeField) {
          const keys = await context.keys()
          for (const key of keys) {
            const item = await context.get<unknown>(key)
            if (
              isObject(item) &&
              isObject(action.payload) &&
              (item as any)[dedupeField] === (action.payload as any)[dedupeField]
            ) {
              return done()
            }
          }
        }

        await context.set(generateId(), action.payload)
        const keys = (await context.keys()).sort((a, b) => {
          return parseInt(b.split('-')[0] ?? '0', 10) - parseInt(a.split('-')[0] ?? '0', 10)
        })

        let i = 0
        if (dispatchWhenIncomplete) {
          const values = []
          for (; i < keys.length; i++) {
            values.push(await context.get(keys[i]!))
          }
          send(Event.batch(values))
        } else {
          if (keys.length >= maxSize) {
            const values = []
            for (; i < maxSize; i++) {
              values.push(await context.get(keys[i]!))
            }
            send(Event.batch(values))
          }
        }

        if (keys.length >= maxSize) {
          const previousMsg = isString(keys[maxSize]) ? await context.get<object>(keys[maxSize]!) : undefined
          if (!!previousMsg) {
            send(Event.overflow(previousMsg))
          }
          for (; i < keys.length; i++) {
            await context.set(keys[i]!)
          }
        }
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

function generateId() {
  return `${Date.now()}-${uuid()}`
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isObject(obj: unknown): obj is object {
  return {}.toString.call(obj) === '[object Object]' && obj != null
}
