import { Node } from 'node-red'
import ImapClient, { Mailbox } from 'emailjs-imap-client'
import { asyncContext } from '../context'
import { simpleParser } from 'mailparser'
import { Actions, Events, Event, isGmailEmail } from './imap-reader.common'
import { inspect } from 'util'

export function Setup({
  username: user,
  password: pass,
  url,
  port,
  node,
}: {
  node: Node
  username: string
  password: string
  url: string
  port: number
}) {
  const context = asyncContext(node.context())

  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        const keys = await context.keys()
        for (const key of keys) {
          await context.set(key)
        }
        return done()
      }
      case 'SEARCH.V1': {
        const imap = new ImapClient(url, port, {
          auth: {
            user,
            pass,
            useSecureTransport: true,
            requireTLS: true,
          },
          logLevel: 'error',
        })
        try {
          await imap.connect()
          const mailbox = action.payload.mailbox.toUpperCase()
          const since = action.payload.since ? new Date(action.payload.since) : null
          const before = action.payload.before ? new Date(action.payload.before) : null
          const query = {
            ...(isValidDate(since) ? { since } : {}),
            ...(isValidDate(before) ? { before } : {}),
          }

          const messageIds = await imap.search(mailbox, query)
          const messages = await imap.listMessages(mailbox, messageIds.join(','), ['X-GM-LABELS', 'body[]'])

          const mails = await Promise.all(
            messages.map(async (message) => {
              if (!isGmailEmail(message)) {
                node.log(`Email message is not valid\n${inspect(message)}`)
                return
              }
              const mail = await simpleParser(message['body[]'])
              return {
                id: mail.messageId!,
                subject: mail.subject,
                from: mail.from?.text,
                to: mail.to?.text,
                labels: [...(message['x-gm-labels'] as string[]), mailbox].map((it) => it.toLowerCase()),
                content: mail.html || mail.text || '',
                receivedAt: isValidDate(mail.date) ? mail.date.toISOString() : undefined,
              }
            }),
          )

          const validEmails = mails.filter((it) => !!it)
          if (validEmails.length > 0) {
            node.status({
              fill: 'green',
              shape: 'dot',
              text: `Found ${validEmails.length} new messages in ${mailbox} ${time()}`,
            })
          }
          node.log(`Found ${validEmails.length} new messages in ${mailbox}`)

          validEmails.forEach((message) => {
            send(
              Event.result({
                content: isStringNonEmpty(message?.content) ? message!.content : undefined,
                labels: message?.labels ?? [],
                from: isStringNonEmpty(message?.from) ? message!.from : undefined,
                to: isStringNonEmpty(message?.to) ? message!.to : undefined,
                subject: isStringNonEmpty(message?.subject) ? message!.subject : undefined,
                receivedAt: isStringNonEmpty(message?.receivedAt) ? message!.receivedAt : undefined,
              }),
            )
          })
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          node.error(`${inspect(error)}`)
        }
        await imap.close()
        return done()
      }
      case 'FETCH.V1': {
        const imap = new ImapClient(url, port, {
          auth: {
            user,
            pass,
            useSecureTransport: true,
            requireTLS: true,
          },
          logLevel: 'error',
        })

        try {
          await imap.connect()
          const { highestModseq } = await imap.selectMailbox('INBOX')
          const previousHighestModseq = await context.get<string>('highestModseq')
          const { children: mailboxes } = await imap.listMailboxes()
          const allMailboxes = collectMailboxes(mailboxes)
          node.trace(`All mailboxes ${allMailboxes.join(', ')}`)
          const mailboxLabels = [...allMailboxes.filter((it) => !it.startsWith('[')), 'INBOX'].filter(onlyUnique)
          if (!previousHighestModseq) {
            node.log(`First scan`)
            await context.set('highestModseq', highestModseq)
            return done()
          }
          node.log(`Scanning mailboxes: ${mailboxLabels.join(', ')}`)
          node.status({ fill: 'yellow', shape: 'dot', text: `Scanning mailboxes ${time()}` })
          const cache = new Map<string, Mail>()
          for (const mailbox of mailboxLabels) {
            const messages = await imap.listMessages(mailbox, '1:*', ['X-GM-LABELS', 'body[]'], {
              changedSince: previousHighestModseq,
            })
            const mails = await Promise.all(
              messages.map(async (message) => {
                if (!isGmailEmail(message)) {
                  node.log(`Email message is not valid\n${inspect(message)}`)
                  return
                }
                const mail = await simpleParser(message['body[]'])
                return {
                  id: mail.messageId!,
                  subject: mail.subject,
                  from: mail.from?.text,
                  to: mail.to?.text,
                  content: mail.html || mail.text || '',
                  labels: [...(message['x-gm-labels'] as string[]), mailbox].map((it) => it.toLowerCase()),
                  receivedAt: isValidDate(mail.date) ? mail.date.toISOString() : undefined,
                }
              }),
            )
            const validEmails = mails.filter((it) => !!it)
            if (validEmails.length > 0) {
              node.status({
                fill: 'green',
                shape: 'dot',
                text: `Found ${validEmails.length} new messages in ${mailbox} ${time()}`,
              })
            }
            node.log(`Found ${validEmails.length} new messages in ${mailbox}`)
            validEmails.forEach((it) => cache.set(it!.id, it!))
          }
          const uniqueMessages = Array.from(cache.values()).reduce((acc, it) => {
            if (!(it.id in acc)) {
              acc[it.id] = it
              return acc
            }
            acc[it.id].labels = [...acc[it.id].labels, ...it.labels]
              .filter((it) => isStringNonEmpty(it))
              .filter(onlyUnique)
              .map((it) => it.toLowerCase())
            return acc
          }, {} as Record<string, Mail>)
          Object.values(uniqueMessages).forEach((message) => {
            send(
              Event.result({
                content: isStringNonEmpty(message.content) ? message.content : undefined,
                labels: message.labels,
                from: isStringNonEmpty(message.from) ? message.from : undefined,
                to: isStringNonEmpty(message.to) ? message.to : undefined,
                subject: isStringNonEmpty(message.subject) ? message.subject : undefined,
                receivedAt: isStringNonEmpty(message.receivedAt) ? message.receivedAt : undefined,
              }),
            )
          })
          await context.set('highestModseq', highestModseq)
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
          node.error(
            [
              `${inspect(error)}`,
              `Please notice that labels should not containt \`/\` (backslashes).`,
              `Also, you might need to unlock the Captcha "https://accounts.google.com/DisplayUnlockCaptcha".`,
            ].join('\n'),
          )
        }
        await imap.close()
        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function onlyUnique(value: string, index: number, self: string[]) {
  return self.indexOf(value) === index
}

function collectMailboxes(mailboxes: Mailbox[]): string[] {
  return mailboxes.map((it) => [it.path, ...collectMailboxes(it.children)]).reduce((acc, it) => [...acc, ...it], [])
}

interface Mail {
  id: string
  subject?: string
  from?: string
  to?: string
  content: string
  labels: string[]
  receivedAt?: string
}

function assertUnreachable(x: never): void {}

function isStringNonEmpty(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

function time() {
  return new Date().toISOString().substr(11, 5)
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.valueOf())
}
