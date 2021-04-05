import humanInterval from 'human-interval'
import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './lru-cache.lib'
import { asyncContext } from '../context'
import { upgradeAction, isAction, isEvent } from './lru-cache.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function LRUCache(this: Node, config: NodeProperties & { ttl: unknown; dedupeField: unknown }) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())
    const ttl = isString(config.ttl) ? humanInterval(config.ttl) : undefined
    const dedupeField =
      isString(config.dedupeField) && config.dedupeField.trim().length > 0 ? config.dedupeField.trim() : undefined

    if (!isNumber(ttl)) {
      node.error(`Please enter a valid ttl`)
      return
    }

    WorkerNode({
      fn: Setup({ context, ttl, node, dedupeField }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('lrucache', LRUCache)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}
