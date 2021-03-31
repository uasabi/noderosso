import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './reminder.lib'
import { isAction, upgradeAction, isEvent } from './reminder.common'
import { WorkerNode } from '../worker-node'
import { google } from 'googleapis'
import { Request, Response } from 'express'

module.exports = function (RED: Red) {
  function Reminder(this: Node, config: NodeProperties) {
    RED.nodes.createNode(this, config)
    const node = this

    WorkerNode({
      fn: Setup({ node }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('reminder', Reminder, {
    credentials: {
      clientId: { type: 'text' },
      clientSecret: { type: 'password' },
      redirectUri: { type: 'text' },
      accessToken: { type: 'password' },
      refreshToken: { type: 'password' },
    },
  })
  RED.httpAdmin.get('/reminder/auth', (req: Request, res: Response) => {
    const { clientId, clientSecret, id } = req.query
    if (typeof clientId === 'string' && typeof clientSecret === 'string' && typeof id === 'string') {
      const redirectUri = `${req.protocol}://${req.get('Host')}/admin/reminder/token`
      const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
      RED.nodes.addCredentials(id, {
        clientId: req.query.clientId,
        clientSecret: req.query.clientSecret,
        redirectUri,
      })
      res.redirect(
        client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/calendar'],
          state: id,
        }),
      )
    } else {
      res.status(401).send('malformed request')
    }
  })
  RED.httpAdmin.get('/reminder/token', async (req: Request, res: Response) => {
    const { state: id, code } = req.query
    if (typeof id === 'string' && typeof code === 'string') {
      const creds = RED.nodes.getCredentials(id) as { clientId: string; clientSecret: string; redirectUri: string }
      const {
        tokens: { refresh_token: refreshToken, access_token: accessToken },
      } = await new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri).getToken(code)
      RED.nodes.addCredentials(id, {
        ...RED.nodes.getCredentials(id),
        refreshToken,
        accessToken,
      })
      res.send('Authorized!')
    } else {
      res.status(401).send('malformed request')
    }
  })
}
