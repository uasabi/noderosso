import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './wordpress-scraper.lib'
import { isAction, upgradeAction, isEvent } from './wordpress-scraper.common'
import { WorkerNode } from '../worker-node'
import { URL } from 'url'

module.exports = function (RED: Red) {
  function WordpressNode(this: Node, config: NodeProperties & { url: string }) {
    RED.nodes.createNode(this, config)
    const node = this

    try {
      new URL(config.url)
    } catch {
      this.error('Invalid url')
    }

    const url = `${config.url.endsWith('/') ? config.url : `${config.url}/`}wp-json/`

    WorkerNode({
      fn: Setup({ node, baseUrl: url }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('wordpressscraper', WordpressNode)
}
