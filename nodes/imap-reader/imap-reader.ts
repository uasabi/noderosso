import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './imap-reader.lib'
import { WorkerNode } from '../worker-node'
import { isEvent, upgradeAction, isAction } from './imap-reader.common'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

module.exports = function (RED: Red) {
  function ImapReader(this: Node, config: NodeProperties & { url: string; username: string; port: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const password = (this as any).credentials.password
    const username = config.username
    const url = config.url
    const port = Math.max(parseInt(config.port, 10), 0)

    if (!isString(username) || username.trim().length === 0) {
      node.error('Invalid username')
      return
    }
    if (!isString(password) || password.trim().length === 0) {
      node.error('Invalid password')
      return
    }
    if (!isString(url) || url.trim().length === 0) {
      node.error('Invalid url')
      return
    }
    if (!isNumber(port)) {
      node.error('Invalid port')
      return
    }

    WorkerNode({
      fn: Setup({ node, password, username, url, port }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('imap-reader', ImapReader, {
    credentials: {
      password: { type: 'password' },
    },
  })
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}
