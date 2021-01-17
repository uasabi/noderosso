import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './reddit-scraper.lib'
import { isAction, upgradeAction, isEvent } from './reddit-scraper.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function RedditScraperNode(this: Node, config: NodeProperties) {
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
  RED.nodes.registerType('redditscraper', RedditScraperNode)
}
