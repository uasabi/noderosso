import { Red, Node, NodeProperties } from 'node-red'
import { WorkerNode } from '@noderosso/packages/worker_node'
import { isAction, isEvent, upgradeAction } from './slack.common'
import { Setup, SetupArg } from './slack.lib'

module.exports = function (RED: Red) {
  function Slack(
    this: Node,
    config: NodeProperties & {
      name: string
      slack_account: string
    },
  ) {
    RED.nodes.createNode(this, config)
    const node = this

    const configurationNode = RED.nodes.getNode(config?.slack_account)

    const accountName = (configurationNode as any)?.account_name?.trim()
    const accountPassword = (configurationNode?.credentials as any)?.account_password?.trim()

    if (!(isString(accountName) && !isEmpty(accountName))) {
      this.error(`Invalid account name ${accountName}`)
      return
    }

    if (!(isString(accountPassword) && !isEmpty(accountPassword))) {
      this.error(`Invalid account password ${accountPassword}`)
      return
    }

    const setupArg: SetupArg = {
      node,
      accountName,
      accountPassword,
    }
    WorkerNode({
      fn: Setup(setupArg),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('slack', Slack)

  function SlackAccount(
    this: Node,
    config: NodeProperties & {
      account_name: string
      account_password: string
    },
  ) {
    RED.nodes.createNode(this, config)
    ;(this as any).name = config.name
    ;(this as any).account_name = config.account_name
    ;(this as any).account_password = config.account_password
  }

  RED.nodes.registerType('Slack account', SlackAccount, {
    credentials: {
      account_name: { type: 'text' },
      account_password: { type: 'password' },
    },
  })
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isEmpty(value: string): boolean {
  return value.trim().length === 0
}
