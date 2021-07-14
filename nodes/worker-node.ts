import { Channel, Loop } from './channel'
import { Node } from 'node-red'
import { inspect } from 'util'
import { setTimeout } from 'timers'
import * as z from 'zod'

export function WorkerNode<Actions, Events>({
  node,
  fn,
  isAction = (action: unknown): action is Actions => !!action,
  isEvent,
  actions,
}: {
  node: Node
  fn: (action: Actions, send: (event: Events) => void, done: () => void) => void | Promise<void>
  isAction?: (action: unknown) => action is Actions
  isEvent: (event: unknown) => event is Events
  actions: z.ZodAny
}) {
  type QueueItem = [Actions, (events: Events) => void, () => void]
  const channel = new Channel()
  node.on('input', (message, send, done) => {
    const action = upgradeAction(node, actions, message)
    if (action === undefined) {
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

export function upgradeAction(node: Node, actions: z.ZodAny, message: any): z.infer<typeof actions> | undefined {
  const validate = actions.safeParse(message)
  if (!validate.success) {
    const { fieldErrors } = validate.error.flatten()
    if ('topic' in fieldErrors) {
      for (const topicErr of fieldErrors.topic!) {
        // if the error message look like this: `Expected XXX.V2, received XXX.V1`
        // the action is upgradeable, so we upgrade the action to XXX.V2
        if (topicErr.includes('Expected') && topicErr.includes(', received')) {
          const upgradedTopic = topicErr.substring('Expected'.length + 1, topicErr.indexOf(', '))

          const upgradedMessage = { ...message, topic: upgradedTopic }
          node.log(
            [
              `Original message: ${JSON.stringify(message, null, 2)}`,
              `upgraded to ${JSON.stringify(upgradedMessage, null, 2)}`,
            ].join('\n'),
          )

          const validate = actions.safeParse(upgradedMessage)
          if (validate.success) {
            return validate.data
          } else {
            node.warn(`Invalid action ${inspect(upgradedMessage)}`)
            return undefined
          }
        }
      }
    }
  }
  return message
}
