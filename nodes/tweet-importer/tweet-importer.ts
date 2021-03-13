import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './tweet-importer.lib'
import { isAction, upgradeAction, isEvent } from './tweet-importer.common'
import { WorkerNode } from '../worker-node'
import { Request, Response } from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'

const tachyonsCss = readFileSync(join(__dirname, './tachyons.min.4.12.0.css'))

module.exports = function (RED: Red) {
  function TweetImporter(this: Node, config: NodeProperties) {
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

  RED.nodes.registerType('tweet-importer', TweetImporter)

  RED.httpAdmin.get(`/tweet-importer/:id`, async function (req: Request, res: Response) {
    const nodeId = req.params.id

    const form = [
      '<div class="bg-washed-blue pa3 ba bw1 b--light-gray br2 mt4">',
      `  <form action="/admin/tweet-importer/${nodeId}" method="POST">`,
      '    <p class="f5 mb0">Upload a csv file.</p>',
      '    <input id="csv-input" type="file" name="file" class="mv3 input-reset ba w-100 br2 bg-white f4 pv2 ph3 b--silver border-box"/>',
      '    <p class="f2 tc">OR</p>',
      '    <p class="f5 mb0">Copy and paste csv text here.</p>',
      '    <textarea id="csv-textarea" rows="5" name="csv" class="mv3 input-reset ba w-100 br2 bg-white f6 pv2 ph3 b--silver"></textarea>',
      '    <input type="submit" id="submit" name="submit" value="Submit" class="input-reset bn pv2 bg-navy white db w-100 ttu b f4 br1"/>',
      '  </form>',
      '</div>',
    ]
      .map((it) => it.trim())
      .join('')

    const html = `${form}`
    res.send(
      [
        `<!DOCTYPE html>`,
        `<head><title>Tweet Importer</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${tachyonsCss}</style></head>`,
        `<body class="sans-serif"><div class="mw7 center">${html}</div></body>`,
        `<script>!${readCsvFile.toString()}()</script>`,
      ].join(''),
    )
  })

  RED.httpAdmin.post(`/tweet-importer/:id`, async function (req: Request, res: Response) {
    const nodeId = req.params.id ?? ''
    const node = RED.nodes.getNode<Node>(nodeId)

    if (!node) {
      return res.redirect(`/admin/tweet-importer/${nodeId}`)
    }

    if (hasOwnProperty(req.body, 'csv')) {
      const csvText = req.body.csv

      if (!isString(csvText)) {
        return res.redirect(`/admin/tweet-importer/${nodeId}`)
      }

      node.receive({
        topic: 'IMPORT.V1',
        payload: {
          csv: csvText,
        },
      })
    }

    setTimeout(() => {
      res.redirect(`/admin/tweet-importer/${nodeId}`)
    }, 500)
  })
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop)
}

function readCsvFile() {
  const csvInput = document.getElementById('csv-input') as HTMLInputElement | null
  const csvTextarea = document.getElementById('csv-textarea') as HTMLInputElement | null
  if (!csvInput) {
    return
  }
  if (!csvTextarea) {
    return
  }
  csvInput.addEventListener('input', function (e) {
    const mimeTypes = [
      'text/plain',
      'text/x-csv',
      'application/vnd.ms-excel',
      'application/csv',
      'application/x-csv',
      'text/csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values',
      'text/tab-separated-values',
    ]
    const files: File[] = csvInput.files ? [].slice.call(csvInput.files) : []
    const csvfiles: File[] = files.filter((file) => mimeTypes.includes(file.type))
    if (csvfiles.length === 0) {
      return
    }
    const csvfile = csvfiles[0]!
    const reader = new FileReader()
    reader.onload = () => {
      const content = (reader.result as string) || ''
      csvTextarea.value = content
    }
    reader.readAsText(csvfile)
  })
}
