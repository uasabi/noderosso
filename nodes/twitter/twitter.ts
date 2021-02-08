import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './twitter.lib'
import { isAction, upgradeAction, isEvent } from './twitter.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function Twitter(this: Node, config: NodeProperties) {
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
  RED.nodes.registerType('twitter', Twitter, {
    credentials: {
      consumer_key: {type: 'password'},
      consumer_secret: {type: 'password'},
      access_token_key: {type: 'password'},
      access_token_secret: {type: 'password'}
    }
  })
}
