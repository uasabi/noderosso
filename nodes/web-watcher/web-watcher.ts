import url from 'url'
import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './web-watcher.lib'
import { asyncContext } from '@noderosso/packages/context'
import { WorkerNode } from '@noderosso/packages/worker_node'
import { isEvent, isAction, upgradeAction } from './web-watcher.common'

module.exports = function (RED: Red) {
  function WebWatcher(this: Node, config: NodeProperties & { url: string; selector: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const parsedUrl = url.parse(config.url)
    const context = asyncContext(node.context())
    const selector = config.selector

    if (!(parsedUrl.host || (parsedUrl.hostname && parsedUrl.port))) {
      this.error('Invalid url')
      return
    }

    if (selector.trim().length === 0) {
      this.error('Invalid selector')
      return
    }

    WorkerNode({
      fn: Setup({ context, node, url: config.url, selector }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('web-watcher', WebWatcher)
}
