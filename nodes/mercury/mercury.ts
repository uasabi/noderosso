import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './mercury.lib'
import { isAction, actions, isEvent } from './mercury.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function MercuryNode(this: Node, config: NodeProperties) {
    RED.nodes.createNode(this, config)
    const node = this

    WorkerNode({
      fn: Setup({ node }),
      isAction,
      isEvent,
      node,
      actions,
    })
  }
  RED.nodes.registerType('mercury', MercuryNode)
}
