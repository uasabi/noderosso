declare module '~emailjs-imap-client/index' {
  export default class ImapClient {
    constructor(url: string, port: number, options?: Partial<ImapClientOptions>)
    connect(): Promise<void>
    close(): Promise<void>
    listMailboxes(): Promise<Mailboxes>
    listMessages(
      mailbox: string,
      sequence: string,
      features: string[],
      options?: {
        changedSince: string
      },
    ): Promise<object[]>
    selectMailbox(name: string): Promise<OtherMailbox>
  }

  export interface ImapClientOptions {
    auth: {
      user: string
      pass: string
      useSecureTransport: boolean
      requireTLS: boolean
    }
    logLevel: 'error' | 'warn' | 'info' | 'debug'
  }

  export interface Mailboxes {
    root: boolean
    children: Mailbox[]
  }

  export interface Mailbox {
    name: string
    delimiter: string
    path: string
    children: Mailbox[]
    flags: Array<string | { type: string; value: string }>
    listed: boolean
    subscribed: boolean
  }

  export interface OtherMailbox {
    readOnly: boolean
    exists: number
    flags: string[]
    permanentFlags: string[]
    uidValidity: number
    uidNext: number
    highestModseq: string
  }
}

declare module 'emailjs-imap-client' {
  import alias = require('~emailjs-imap-client/index')
  export = alias
}
