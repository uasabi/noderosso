import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './my-first-node.lib'
import { isAction, actions, isEvent } from './my-first-node.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function MyFirstNode(this: Node, config: NodeProperties) {
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
  RED.nodes.registerType('myfirstnode', MyFirstNode)
}
