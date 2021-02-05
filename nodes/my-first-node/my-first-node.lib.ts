import { Node } from 'node-red'
import { Actions, Events, Event } from './my-first-node.common'

export function Setup({ node }: { node: Node }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'IN.V1': {
        const message = action.payload.message
        send(Event.article({ message: message.toUpperCase() }))
        node.log(`Processed message ${message}`)
        node.status({
          fill: 'green',
          shape: 'dot',
          text: `Last processed ${message} ${time()}`,
        })
        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}
