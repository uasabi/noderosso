import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './reddit-scraper.lib'
import { isAction, upgradeAction, isEvent } from './reddit-scraper.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function RedditScraperNode(this: Node, config: NodeProperties & { subreddit: string | undefined }) {
    RED.nodes.createNode(this, config)
    const node = this
    const subreddit = config.subreddit && parseSubredditUrl(config.subreddit)

    if (!isString(subreddit)) {
      this.error('Invalid subreddit')
      return
    }

    WorkerNode({
      fn: Setup({ node, subreddit }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('redditscraper', RedditScraperNode)
}

function parseSubredditUrl(name: string): string | undefined {
  const blocks = name.split('/')

  if (blocks.length === 1) {
    return isEmpty(name) ? undefined : name.trim()
  }

  if (blocks.length > 0) {
    const last = blocks.slice(-1)[0]!
    return isEmpty(last) ? undefined : last.trim()
  }

  return name

  function isEmpty(value: string): boolean {
    return value.trim().length === 0
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
