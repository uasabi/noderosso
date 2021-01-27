import url from 'url'
import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './feedparse.lib'
import { asyncContext } from '../context'
import humanInterval from 'human-interval'
import { isEvent, upgradeAction, isAction } from './feedparse.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function FeedParseNode(this: Node, config: NodeProperties & { url: string; ttl: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const parsedUrl = url.parse(config.url)
    const context = asyncContext(node.context())
    const ttl = parseTTL(config.ttl)

    if (!(parsedUrl.host || (parsedUrl.hostname && parsedUrl.port))) {
      this.error('Invalid url')
      return
    }

    if (!isNumber(ttl)) {
      this.error('Invalid TTL')
      return
    }

    WorkerNode({
      fn: Setup({ context, ttl, node, url: config.url }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('feedparse-evolution', FeedParseNode)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}

function parseTTL(ttl: unknown): number | undefined {
  if (isString(ttl) && ttl.trim() === '0') {
    return 0
  }

  if (isNumber(ttl) && ttl >= 0) {
    return ttl
  }

  if (isString(ttl)) {
    return humanInterval(ttl.toLocaleLowerCase())
  }

  return undefined
}
