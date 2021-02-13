import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './twitter.lib'
import { isAction, upgradeAction, isEvent } from './twitter.common'
import { WorkerNode } from '../worker-node'
import * as TwitterLite from 'twitter-lite'

module.exports = function (RED: Red) {
  function Twitter(this: Node, config: NodeProperties & { consumer_key?: string; access_token_key?: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const consumerKey = config.consumer_key
    const accessTokenKey = config.access_token_key
    const consumerSecret = (this as any).credentials.consumer_secret
    const accessTokenSecret = (this as any).credentials.access_token_secret

    if (!(isString(consumerKey) && !isEmpty(consumerKey))) {
      this.error(`Invalid consumer key ${consumerKey}`)
      return
    }

    if (!(isString(accessTokenKey) && !isEmpty(accessTokenKey))) {
      this.error(`Invalid access token key ${accessTokenKey}`)
      return
    }

    if (!(isString(consumerSecret) && !isEmpty(consumerSecret))) {
      this.error(`Invalid consumer secret ${consumerSecret}`)
      return
    }

    if (!(isString(accessTokenSecret) && !isEmpty(accessTokenSecret))) {
      this.error(`Invalid access token secret ${accessTokenSecret}`)
      return
    }

    const client = new TwitterLite.default({
      access_token_key: accessTokenKey,
      access_token_secret: accessTokenSecret,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    })

    WorkerNode({
      fn: Setup({ node, client }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('twitter', Twitter, {
    credentials: {
      consumer_secret: { type: 'password' },
      access_token_secret: { type: 'password' },
    },
  })
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isEmpty(value: string): boolean {
  return value.trim().length === 0
}
