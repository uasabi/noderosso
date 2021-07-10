import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './postgres.lib'
import { actions, isAction, isEvent } from './postgres.common'
import { WorkerNode } from '../worker-node'

module.exports = function (RED: Red) {
  function Postgres(this: Node, config: NodeProperties & { sql: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const connectionString = (this as any).credentials.url
    const sqlStatement = config.sql

    WorkerNode({
      fn: Setup({ node, sqlStatement, connectionString }),
      isAction,
      isEvent,
      node,
      actions,
    })
  }
  RED.nodes.registerType('postgres', Postgres, {
    credentials: {
      url: { type: 'password' },
    },
  })
}
