import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './mercury.lib'
import { isAction, upgradeAction, isEvent } from './mercury.common'
import { WorkerNode } from '@noderosso/packages/worker_node'

module.exports = function (RED: Red) {
  function MercuryNode(this: Node, config: NodeProperties) {
    RED.nodes.createNode(this, config)
    const node = this

    WorkerNode({
      fn: Setup({ node }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('mercury', MercuryNode)
}
