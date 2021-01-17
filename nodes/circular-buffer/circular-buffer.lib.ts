import { AsyncContext } from '../context'
import { Node } from 'node-red'
import { Events, Event, Actions } from './circular-buffer.common'

export function Setup({ context, maxSize, node }: { context: AsyncContext; maxSize: number; node: Node }) {
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
        await context.set(generateId(), action.payload)
        const keys = (await context.keys()).sort((a, b) => {
          return parseInt(b.split('-')[0], 10) - parseInt(a.split('-')[0], 10)
        })
        if (keys.length >= maxSize) {
          const values = []
          let i = 0
          for (; i < maxSize; i++) {
            values.push(await context.get(keys[i]))
          }
          send(Event.batch(values))
          const previousMsg = keys[maxSize] ? await context.get<object>(keys[maxSize]) : undefined
          if (!!previousMsg) {
            send(Event.overflow(previousMsg))
          }
          for (; i < keys.length; i++) {
            await context.set(keys[i])
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
