import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './link-store.lib'
import { isAction, upgradeAction, isEvent } from './link-store.common'
import { WorkerNode } from '../worker-node'
import { asyncContext } from '../context'

module.exports = function (RED: Red) {
  function LinkStoreNode(this: Node, config: NodeProperties) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())

    WorkerNode({
      fn: Setup({ node, context }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('linkstore', LinkStoreNode)
}
