import { Node } from 'node-red'
import { Actions, Events, Event } from './sendgrid-extended.common'
import Sendgrid from '@sendgrid/mail'
import { inspect } from 'util'

export function Setup({ node, sendgrid }: { node: Node; sendgrid: typeof Sendgrid }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'SEND.V1': {
        try {
          await sendgrid.send(action.payload)
          node.log(`Sent email ${action.payload.subject} to ${action.payload.to.join(',')}`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Sent email ${action.payload.subject} ${time()}`,
          })
        } catch (error) {
          node.error(`Error: ${inspect(error)}`)
          send(Event.error({ message: inspect(error) }))
          node.status({
            fill: 'red',
            shape: 'dot',
            text: `Error ${time()}`,
          })
        }

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
