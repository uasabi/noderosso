import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './gcalendar.lib'
import { isAction, upgradeAction, isEvent } from './gcalendar.common'
import { WorkerNode } from '../worker-node'
import { google } from 'googleapis'
import { urlencoded, json, Request, Response } from 'express'
import { inspect } from 'util'
import { asyncContext } from '../context'

module.exports = function (RED: Red) {
  function GCalendar(this: Node, config: NodeProperties) {
    RED.nodes.createNode(this, config)
    const node = this
    const credentials = (this as any).credentials
    const context = asyncContext(node.context())

    const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret)
    auth.on('tokens', (tokens) => {
      if (tokens.access_token) {
        context.set('access-token', tokens.access_token)
      }

      if (tokens.refresh_token) {
        context.set('refresh-token', tokens.refresh_token)
      }
    })

    Promise.all([context.get<string>('refresh-token'), context.get<string>('access-token')]).then(
      ([refreshToken, accessToken]) => {
        auth.setCredentials({
          refresh_token: refreshToken ?? credentials.refreshToken,
          access_token: accessToken ?? credentials.accessToken,
        })
      },
    )

    WorkerNode({
      fn: Setup({
        node,
        auth,
      }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('gcalendar', GCalendar, {
    credentials: {
      clientId: { type: 'text' },
      clientSecret: { type: 'password' },
      accessToken: { type: 'password' },
      refreshToken: { type: 'password' },
    },
  })

  RED.httpAdmin.post('/gcalendar/:id/auth', json(), urlencoded({ extended: true }), (req: Request, res: Response) => {
    const node = RED.nodes.getNode(req.params.node ?? '')
    const { clientId, clientSecret, urn } = req.body
    const isValidPayload = isString(clientId) && isString(clientSecret) && isString(urn)

    if (!isValidPayload) {
      res.json({ error: 'Invalid payload' })
      return
    }

    try {
      const client = new google.auth.OAuth2(clientId, clientSecret, urn)
      const redirectUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
      })
      res.json({ redirectUrl })
    } catch (error) {
      node?.error(inspect(error))
      res.json({ error: 'Could not create the link' })
    }
  })

  RED.httpAdmin.post(
    '/gcalendar/:node/token',
    json(),
    urlencoded({ extended: true }),
    async (req: Request, res: Response): Promise<void> => {
      const node = RED.nodes.getNode(req.params.node ?? '')
      const { clientId, clientSecret, urn, code } = req.body
      const isValidPayload = isString(clientId) && isString(clientSecret) && isString(urn) && isString(code)

      if (!isValidPayload) {
        res.json({ error: 'Invalid payload' })
        return
      }

      try {
        const {
          tokens: { refresh_token: refreshToken, access_token: accessToken },
        } = await new google.auth.OAuth2(clientId, clientSecret, urn).getToken(code)
        res.json({ refreshToken, accessToken })
      } catch (error) {
        node?.error(inspect(error))
        res.json({ error: 'Could not authorise' })
      }
    },
  )
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}
