import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './sendgrid-extended.lib'
import { isAction, upgradeAction, isEvent } from './sendgrid-extended.common'
import { WorkerNode } from '@noderosso/packages/worker_node'
import sendgrid from '@sendgrid/mail'
import * as z from 'zod'

module.exports = function (RED: Red) {
  function SendgridExtended(
    this: Node,
    config: NodeProperties & { sendgridAccount: string; sendgridProfile?: string; dryrun: string },
  ) {
    RED.nodes.createNode(this, config)
    const isDryRun = config.dryrun?.trim().toLowerCase() === 'dryrun'
    const node = this
    const configurationNode = RED.nodes.getNode(config.sendgridAccount)

    const validateApiKey = z
      .string()
      .nonempty()
      .safeParse((configurationNode?.credentials as any).apiKey)

    if (!validateApiKey.success) {
      this.error('Invalid api key')
      return
    }

    sendgrid.setApiKey(validateApiKey.data)

    const profileNode = config.sendgridProfile ? RED.nodes.getNode(config.sendgridProfile) : undefined

    const defaults = {
      name: (profileNode as any)?.name,
      from: (profileNode as any)?.from,
      to: (profileNode as any)?.to,
      category: (profileNode as any)?.category,
    }

    WorkerNode({
      fn: Setup({ node, sendgrid, defaults, isDryRun }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('sendgrid-extended', SendgridExtended)

  function SendgridExtendedAccount(this: Node, config: NodeProperties & { accountName: string }) {
    RED.nodes.createNode(this, config)
    ;(this as any).accountName = config.accountName
  }

  RED.nodes.registerType('Sendgrid account', SendgridExtendedAccount, {
    credentials: {
      apiKey: { type: 'password' },
    },
  })

  function SendgridExtendedProfile(
    this: Node,
    config: NodeProperties & { name: string; from: string; to: string; category: string },
  ) {
    RED.nodes.createNode(this, config)
    ;(this as any).name = config.name
    ;(this as any).from = config.from
    ;(this as any).to = config.to
    ;(this as any).category = config.category
  }

  RED.nodes.registerType('Sendgrid profile', SendgridExtendedProfile)
}
