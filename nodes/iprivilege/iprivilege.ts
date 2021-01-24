import url from 'url'
import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './iprivilege.lib'
import { asyncContext } from '../context'
import { WorkerNode } from '../worker-node'
import { isEvent, isAction, upgradeAction } from './iprivilege.common'
import { isString } from 'util'

module.exports = function (RED: Red) {
  function IPrivilege(this: Node, config: NodeProperties & { email: string, userid: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const password = (this as any).credentials.password
    const email = config.email
    const userId = config.userid
    const context = asyncContext(node.context())
    const propertyId = '395f754a-e9c1-48fe-8481-765ecfc78612'

    if (!(isString(password) && password.trim().length > 0)) {
      this.error('Invalid password')
      return
    }

    if (!/@/gi.test(email)) {
      this.error('Invalid email')
      return
    }

    WorkerNode({
      fn: Setup({ context, node, email, password, userId, propertyId }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('iprivilege', IPrivilege, {
    credentials: {
      password: { type: 'password' },
    },
  })
}
