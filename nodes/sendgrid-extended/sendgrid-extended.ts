import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './sendgrid-extended.lib'
import { isAction, upgradeAction, isEvent } from './sendgrid-extended.common'
import { WorkerNode } from '../worker-node'
import sendgrid from '@sendgrid/mail'
import * as z from 'zod'

module.exports = function (RED: Red) {
  function SendgridExtended(this: Node, config: NodeProperties & { sendgridAccount: string }) {
    RED.nodes.createNode(this, config)
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

    WorkerNode({
      fn: Setup({ node, sendgrid }),
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
}
