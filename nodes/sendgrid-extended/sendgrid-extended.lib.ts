import { Node } from 'node-red'
import { Actions, Events, Event } from './sendgrid-extended.common'
import Sendgrid from '@sendgrid/mail'
import { inspect } from 'util'

export function Setup({
  node,
  sendgrid,
  defaults,
  isDryRun,
}: {
  node: Node
  sendgrid: typeof Sendgrid
  defaults?: Partial<{ from: string; to: string; name: string; category: string }>
  isDryRun: boolean
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'SEND.V1': {
        const fromEmail = action.payload.from?.email ?? defaults?.from
        const toEmails = action.payload.to ?? (defaults?.to ? [defaults.to] : [])
        const categories =
          action.payload.categories ??
          (action.payload.category ? [action.payload.category] : undefined) ??
          (defaults?.category ? [defaults.category] : undefined)

        if (!fromEmail) {
          node.error(`Cannot send email without a from address`)
          return done()
        }

        if (!toEmails) {
          node.error(`Cannot send email without to addresses`)
          return done()
        }

        const payload = {
          from: {
            email: fromEmail,
            name: action.payload.from?.name ?? defaults?.name,
          },
          to: toEmails,
          bcc: action.payload.bcc,
          cc: action.payload.cc,
          subject: action.payload.subject ?? action.payload.title,
          attachments: action.payload.attachments,
          html: action.payload.content ?? action.payload.html,
          text: action.payload.text,
          categories,
        }

        if (isDryRun) {
          node.log(`[DRY RUN] Sending\n${JSON.stringify(payload, null, 2)}`)
          return done()
        }

        try {
          await sendgrid.send(payload)
          node.log(`Sent email ${payload.subject ?? 'No subject'} to ${payload.to.join(',')}`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Sent email ${payload.subject} ${time()}`,
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
