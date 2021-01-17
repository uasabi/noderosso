import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './circular-buffer.lib'
import { asyncContext } from '../context'
import { isAction, upgradeAction, isEvent } from './circular-buffer.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function CircularBuffer(this: Node, config: NodeProperties & { size: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())
    const maxSize = parseInt(config.size, 10)

    if (!isNumber(maxSize)) {
      node.error('Max size is not a number')
      return
    }

    WorkerNode({
      fn: Setup({ context, maxSize, node }),
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
