import url from 'url'
import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './iprivilege.lib'
import { asyncContext } from '../context'
import { WorkerNode } from '../worker-node'
import { isEvent, isAction, actions } from './iprivilege.common'
import { urlencoded, json, Request, Response } from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseDate } from 'chrono-node'
import { format } from 'date-fns'

const tachyonsCss = readFileSync(join(__dirname, './tachyons.min.4.12.0.css'))

module.exports = function (RED: Red) {
  function IPrivilege(this: Node, config: NodeProperties & { email: string; userid: string }) {
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
      actions,
    })
  }

  RED.nodes.registerType('iprivilege', IPrivilege, {
    credentials: {
      password: { type: 'password' },
    },
  })

  RED.httpAdmin.get(`/iprivilege/:id`, async function (req: Request, res: Response) {
    const nodeId = req.params.id
    const node = RED.nodes.getNode<Node>(nodeId ?? '')!
    const context = asyncContext(node.context())
    const form = [
      '<div class="bg-washed-blue pa3 ba bw1 b--light-gray br2 mt4">',
      `  <form action="/admin/iprivilege/${nodeId}" method="POST">`,
      '    <label for="date" class="db f3">Enter a date and time <small class="f5">(for example "next week at 7am")</small></label>',
      '    <input type="text" id="date" name="date" class="mv3 input-reset ba w-100 br2 bg-white f4 pv2 ph3 b--silver"/>',
      '    <input type="submit" id="submit" name="submit" value="Book" class="input-reset bn pv2 bg-navy white db w-100 ttu b f4 br1"/>',
      '  </form>',
      '</div>',
    ]
      .map((it) => it.trim())
      .join('')

    let entries = ''
    const keys = await context.keys()

    for (const [index, key] of keys.entries()) {
      const booking = await context.get<Booking>(key)

      if (!booking) {
        continue
      }

      entries += [
        `<li class="mv3 flex pv2 ph4 items-center justify-between ${index % 2 ? 'bg-washed-yellow' : ''}">`,
        '  <div class="flex items-center">',
        `    <p class="lh-copy f4">Booking for <span class="b">${format(
          new Date(booking.date),
          `PPP 'at' h aaaa`,
        )}</span></p>`,
        booking.booked ? `<p class="ml3 ttu bg-green white pv1 ph2 br2 f7 b">Booked</p>` : '',
        !booking.booked ? '<p class="ml3 ttu bg-yellow pv1 ph2 br2 f7 b">Pending</p>' : '',
        '  </div>',
        `  <div><form action="/admin/iprivilege/${nodeId}" method="POST"><input type="hidden" value="${booking.id}" name="id"/><input type="submit" name="delete" value="Delete booking" class="ml3 ttu bg-light-gray pv1 ph2 br2 f6 b bn pointer"/></form></div>`,
        '</li>',
      ].join('')
    }

    if (entries.length === 0) {
      entries = '<p>There are no bookings pending or active.</p>'
    }

    const html = `${form}<ul class="pl0 list">${entries}</ul>`
    res.send(
      [
        `<!DOCTYPE html>`,
        `<head><title>iPrivilege admin</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${tachyonsCss}</style></head>`,
        `<body class="sans-serif"><div class="mw7 center">${html}</div></body>`,
      ].join(''),
    )
  })

  RED.httpAdmin.post(
    `/iprivilege/:id`,
    json(),
    urlencoded({ extended: true }),
    async function (req: Request, res: Response) {
      const nodeId = req.params.id ?? ''
      const node = RED.nodes.getNode<Node>(nodeId)

      if (!node) {
        return res.redirect(`/admin/iprivilege/${nodeId}`)
      }

      if (hasOwnProperty(req.body, 'submit')) {
        const date = parseDate(req.body.date) as Date | null

        if (!date) {
          return res.redirect(`/admin/iprivilege/${nodeId}`)
        }

        node.receive({
          topic: 'BOOK.V1',
          payload: {
            date: req.body.date,
          },
        })
      }

      if (hasOwnProperty(req.body, 'delete')) {
        const bookingId = req.body.id

        if (!isString(bookingId)) {
          return res.redirect(`/admin/iprivilege/${nodeId}`)
        }

        node.receive({
          topic: 'CANCEL.V1',
          payload: {
            bookingId,
          },
        })
      }

      setTimeout(() => {
        res.redirect(`/admin/iprivilege/${nodeId}`)
      }, 500)
    },
  )
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

interface Booking {
  id: string
  date: string
  booked: boolean
  externalBookingId?: string
}
