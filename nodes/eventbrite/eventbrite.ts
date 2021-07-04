import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './eventbrite.lib'
import { upgradeAction, isAction, isEvent } from './eventbrite.common'
import { WorkerNode } from '@noderosso/packages/worker_node'
import Axios from 'axios'

module.exports = function (RED: Red) {
  function Postgres(this: Node, config: NodeProperties & { eventId: string; organizationId: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const token = (this as any).credentials.token

    const axios = Axios.create({
      baseURL: 'https://www.eventbriteapi.com/v3/',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const eventId = config.eventId
    if (!eventId) {
      this.error('Invalid eventId')
      return
    }

    const organizationId = config.organizationId
    if (!eventId) {
      this.error('Invalid organizationId')
      return
    }

    WorkerNode({
      fn: Setup({ node, axios, eventId, organizationId }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('eventbrite', Postgres, {
    credentials: {
      token: { type: 'password' },
    },
  })
}
