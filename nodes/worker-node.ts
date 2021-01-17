import { Channel, Loop } from './channel'
import { Node } from 'node-red'
import { inspect } from 'util'
import { setTimeout } from 'timers'

export function WorkerNode<Actions, Events>({
  node,
  fn,
  isAction,
  isEvent,
  liftAction,
}: {
  node: Node
  fn: (action: Actions, send: (event: Events) => void, done: () => void) => void | Promise<void>
  isAction: (action: unknown) => action is Actions
  isEvent: (event: unknown) => event is Events
  liftAction: (value: unknown) => Actions
}) {
  type QueueItem = [Actions, (events: Events) => void, () => void]
  const channel = new Channel()
  node.on('input', (message, send, done) => {
    const action = liftAction(message)
    if (!isAction(action)) {
      node.warn(`Invalid action ${inspect(action)}`)
      return done()
    }
    channel.put<QueueItem>([action, send, done])
  })

  const unsubscribe = Loop<QueueItem>(
    channel,
    async (messages) => {
      for (const [message, send, done] of messages) {
        const wrappedSend = (event: Events) => {
          if (isEvent(event)) {
            send(event)
          } else {
            node.warn(`Invalid event ${inspect(event)}`)
          }
        }
        try {
          await fn(message, wrappedSend, done)
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          try {
            node.error(`ERROR:\n------\n${inspect(error)}\nMESSAGE\n-------\n${inspect(message)}`)
          } catch {
            console.log('Invalid error', error)
          }
          done()
        }
      }
    },
    (error) => node.error(inspect(error)),
  )

  node.on('close', (removed, done) => {
    unsubscribe()
    node.log(`Closing node ${node.id}`)
    setTimeout(done, 5000)
  })
}

function time() {
  return new Date().toISOString().substr(11, 5)
}
