import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './circular-buffer.lib'
import { asyncContext } from '@noderosso/packages/context'
import { isAction, upgradeAction, isEvent } from './circular-buffer.common'
import { WorkerNode } from '@noderosso/packages/worker_node'

module.exports = function (RED: Red) {
  function CircularBuffer(
    this: Node,
    config: NodeProperties & { size: string; dedupeField: unknown; dispatchWhenIncomplete: unknown },
  ) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())
    const maxSize = parseInt(config.size, 10)
    const dedupeField =
      isString(config.dedupeField) && config.dedupeField.trim().length > 0 ? config.dedupeField.trim() : undefined
    const dispatchWhenIncomplete = config.dispatchWhenIncomplete === 'yes' ? true : false

    if (!isNumber(maxSize)) {
      node.error('Max size is not a number')
      return
    }

    WorkerNode({
      fn: Setup({ context, maxSize, node, dedupeField, dispatchWhenIncomplete }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('circularbuffer', CircularBuffer)
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
