import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './twitter-v2.lib'
import { isAction, upgradeAction, isEvent } from './twitter-v2.common'
import { WorkerNode } from '../worker-node'
import { TwitterClient } from 'twitter-api-client'

module.exports = function (RED: Red) {
  function Twitter(this: Node, config: NodeProperties & { twitterAccount: string }) {
    RED.nodes.createNode(this, config)
    const node = this

    const configurationNode = RED.nodes.getNode(config.twitterAccount)

    const consumerKey = (configurationNode as any)?.consumer_key?.trim()
    const accessTokenKey = (configurationNode as any)?.access_token_key?.trim()
    const consumerSecret = (configurationNode?.credentials as any)?.consumer_secret?.trim()
    const accessTokenSecret = (configurationNode?.credentials as any)?.access_token_secret?.trim()

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

    const client = new TwitterClient({
      apiKey: consumerKey,
      apiSecret: consumerSecret,
      accessToken: accessTokenKey,
      accessTokenSecret: accessTokenSecret,
    })

    WorkerNode({
      fn: Setup({ node, client }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('twitter-v2', Twitter)

  function TwitterAccount(this: Node, config: NodeProperties & { consumer_key?: string; access_token_key?: string }) {
    RED.nodes.createNode(this, config)
    ;(this as any).name = config.name
    ;(this as any).consumer_key = config.consumer_key
    ;(this as any).access_token_key = config.access_token_key
  }

  RED.nodes.registerType('Twitter account', TwitterAccount, {
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
