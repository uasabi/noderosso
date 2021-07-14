import { Red, NodeProperties, Node } from 'node-red'
import { asyncContext } from '@noderosso/packages/context'
import { urlencoded, json, Request, Response } from 'express'
import humanInterval from 'human-interval'
import hastParser from 'hast-util-raw'
import visit from 'unist-util-visit'
import * as Hast from 'hast'
import toHtml from 'hast-util-to-html'
import { selectAll } from 'hast-util-select'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DocumentRecord, upgradeAction, isAction, isEvent } from './classifier.common'
import { WorkerNode } from '@noderosso/packages/worker_node'
import { Setup } from './classifier.lib'
import { setTimeout } from 'timers'

interface ClassifierNode extends Node {
  categories: string[]
}

const tachyonsCss = readFileSync(join(__dirname, './tachyons.min.4.12.0.css'))

module.exports = function (RED: Red) {
  function ClassifierNode(
    this: ClassifierNode,
    config: NodeProperties & {
      dryrun: string
      ttl: string
      categories: string
      autoaccept: string
      unverifiedttl: string
    },
  ) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())
    const isDryRun = config.dryrun === 'dryrun'
    const ttl = isString(config.ttl) ? humanInterval(config.ttl.toLowerCase()) : undefined
    const unverifiedTtl = isString(config.unverifiedttl) ? humanInterval(config.unverifiedttl.toLowerCase()) : undefined
    const categories = (this.categories = isString(config.categories) ? config.categories.split(',') : [])
    let autoaccept = config.autoaccept === 'yes' ? true : false

    if (!isNumber(ttl)) {
      this.error('Invalid TTL')
      return
    }

    if (!isNumber(unverifiedTtl)) {
      this.error('Invalid unverified TTL')
      return
    }

    const fn = Setup({
      context,
      isDryRun,
      node,
      documentExpiry: ttl,
      categories,
      autoaccept,
      unverifiedDocumentExpiry: unverifiedTtl,
    })

    node.on('close', (removed, done) => {
      node.receive({ topic: 'SHUTDOWN.V1', _msgid: RED.util.generateId() })
      setTimeout(done, 5000)
    })

    WorkerNode({
      fn,
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('classifier', ClassifierNode)

  RED.httpAdmin.get(`/classifier/:id`, async function (req: Request, res: Response) {
    const nodeId = req.params.id
    const limit = isNumber(parseInt(`${req.query.limit}`, 10)) ? parseInt(`${req.query.limit}`, 10) : 100
    const node = RED.nodes.getNode<ClassifierNode>(nodeId ?? '')!
    const context = asyncContext(node.context())
    const categories = node.categories
    const keys = (await context.keys())
      .sort((a, b) => {
        return parseInt(b.split('-')[0] ?? '0', 10) - parseInt(a.split('-')[0] ?? '0', 10)
      })
      .slice(0, limit)
    const documents = (
      await Promise.all(keys.map(async (it) => ({ documentId: it, document: await context.get<DocumentRecord>(it) })))
    ).filter((it) => !!it.document) as { documentId: string; document: DocumentRecord }[]
    const html = documents
      .sort((a, b) => new Date(b.document.createdAt).valueOf() - new Date(a.document.createdAt).valueOf())
      .map(({ documentId, document }) => {
        return renderRow({
          formUrl: `/admin/classifier/${nodeId}/document/${documentId}`,
          document,
          documentId,
          categories,
        })
      })
      .join('')
    res.send(
      [
        `<!DOCTYPE html>`,
        `<head><title>Classifier admin</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${tachyonsCss}</style></head>`,
        `<body class="sans-serif"><div class="mw9 center">${html}</div><script>(${JS.toString()})()</script></body>`,
      ].join(''),
    )
  })

  RED.httpAdmin.post(
    `/classifier/:node/document/:id`,
    json(),
    urlencoded({ extended: true }),
    async function (req: Request, res: Response) {
      const nodeId = req.params.node
      const documentId = req.params.id
      const node = RED.nodes.getNode<ClassifierNode>(nodeId ?? '')
      if (!node || !documentId) {
        return res.redirect(`/admin/classifier/${nodeId}`)
      }
      const context = asyncContext(node.context())

      if (hasOwnProperty(req.body, 'delete')) {
        await context.set(documentId)
        return res.redirect(`/admin/classifier/${nodeId}`)
      }

      const currentCategory = `${(req.body as any).category}`.trim()
      node.receive({
        topic: 'ADD_CLASSIFICATION.V1',
        payload: {
          documentId,
          category: currentCategory,
        },
      })
      res.redirect(`/admin/classifier/${nodeId}`)
    },
  )
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop)
}

function parseHtml(content: string) {
  return hastParser({
    type: 'root',
    children: [
      { type: 'doctype', name: 'html' },
      { type: 'raw', value: content ?? '' },
    ],
  })
}

function plainHtml(text: string) {
  const hast = parseHtml(text)
  visit<Hast.Element>(hast, 'element', (node) => {
    const { title, alt, href, src } = node.properties
    node.properties = { title, alt, href, src }
  })
  selectAll<Hast.Element>('a', hast).forEach((it) => {
    it.properties.target = '_blank'
    it.properties.class = 'navy underline'
  })
  return toHtml(hast, { allowDangerousHtml: true })
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}

function JS() {
  document.querySelector('body')?.addEventListener('click', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'category') {
      event.preventDefault()
      const formElement = event.target.parentElement?.parentElement?.parentElement as HTMLFormElement | undefined
      const rowElement = formElement?.parentElement?.parentElement?.parentElement as HTMLFormElement | undefined
      if (!formElement || !rowElement) {
        return
      }
      const documentId = rowElement.getAttribute('id')
      if (!documentId) {
        return
      }
      fetch(formElement.action, { method: 'POST', body: new URLSearchParams(`category=${event.target.value}`) })
        .then((it) => it.text())
        .then((it) => {
          const fragment = document.createElement('div')
          fragment.innerHTML = it
          const html = fragment.querySelector(`#${documentId}`)?.innerHTML
          if (!html) {
            return
          }
          rowElement.innerHTML = html
        })
    }
    if (event.target instanceof HTMLInputElement && event.target.name === 'delete') {
      event.preventDefault()
      const formElement = event.target.parentElement as HTMLFormElement | undefined
      const rowElement = formElement?.parentElement?.parentElement?.parentElement as HTMLFormElement | undefined
      if (!formElement || !rowElement) {
        return
      }
      fetch(formElement.action, { method: 'POST', body: new URLSearchParams(`delete=true`) })
        .then((it) => it.text())
        .then((it) => {
          const parent = rowElement.parentElement
          if (!parent) {
            return
          }
          parent.removeChild(rowElement)
        })
    }
  })
}

function renderRow({
  document,
  documentId,
  categories,
  formUrl,
}: {
  document: DocumentRecord
  documentId: string
  categories: string[]
  formUrl: string
}) {
  return [
    `<div class="bt b--light-gray pa3 mv3 flex-l" id="doc-${documentId}">`,

    `<div class="w4-l mr3-l" style="flex-shrink: 0">`,
    `<div class="f7 gray">${new Date(document.createdAt).toLocaleDateString()}&nbsp;${new Date(
      document.createdAt,
    ).toLocaleTimeString()}</div>`,
    `<div class="dn db-l mt3"><span class="bg-dark-gray white b pa1 br2 dib f7">${documentId}</span></div>`,
    `</div>`,

    `<div class="flex-auto-l">`,
    `<div class="mv3 mt0-l f5">${plainHtml(document.text)}</div>`,
    `<div class="mv3 f6">${document.keywords.join(', ') || '<span class="gray">No keywords</span>'}</div>`,
    `</div>`,

    `<div class="w5-l ml3-l" style="flex-shrink: 0">`,
    document.verified
      ? `<div class="mv3 mt0-l bg-washed-blue pa2"><span class="dib w1 h1 tc br-100 bg-light-blue white pa1 mr2 b v-mid lh-solid">V</span> Verified</div>`
      : '',
    `<div class="">${renderForm({
      formUrl,
      categories,
      isVerified: document.verified,
      selectedCategory: document.category,
    })}</div>`,
    `</div>`,

    '</div>',
  ].join('')
}

function renderForm({
  categories,
  isVerified,
  selectedCategory,
  formUrl,
}: {
  categories: string[]
  isVerified: boolean
  selectedCategory?: string
  formUrl: string
}) {
  const activeVerifiedClass = 'input-reset bn pv2 bg-navy white db w-100 ttu b f6'
  const activeClass = 'input-reset bn pv2 bg-gray white db w-100 hover-bg-washed-blue ttu b pointer f6'
  const passiveClass = 'input-reset bn pv2 bg-near-white db w-100 hover-bg-washed-blue ttu b pointer f6'
  return [
    `<form action="${formUrl}" method="POST">`,
    `<ul class="list pl0 mv0">${categories
      .map(
        (it, index, array) =>
          `<li class="${index === array.length - 1 ? '' : 'bb'} b--light-gray overflow-hidden ${
            index === 0 ? 'br2 br--top' : index === array.length - 1 ? 'br2 br--bottom' : ''
          }"><input type="submit" value="${it}" name="category" class="${
            it === selectedCategory ? (isVerified ? activeVerifiedClass : activeClass) : passiveClass
          }"/></li>`,
      )
      .join('')}</ul>`,
    `<input type="submit" name="delete" class="${passiveClass} br2 mt2" value="delete"/>`,
    `</form>`,
  ].join('')
}
