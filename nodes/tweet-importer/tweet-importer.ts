import { Red, Node, NodeProperties } from 'node-red'
import { csv2Tweets, Setup } from './tweet-importer.lib'
import { isAction, upgradeAction, isEvent, Tweet } from './tweet-importer.common'
import { WorkerNode } from '@noderosso/packages/worker_node'
import { Request, Response } from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'
import { v2 as cloudinary } from 'cloudinary'

const tachyonsCss = readFileSync(join(__dirname, './tachyons.min.4.12.0.css'))

module.exports = function (RED: Red) {
  function TweetImporter(this: Node, config: NodeProperties & { cloudinaryAccount?: string }) {
    RED.nodes.createNode(this, config)
    const node = this

    if (!config.cloudinaryAccount) {
      this.error('Missing Cloudinary account')
      return
    }

    const configurationNode = RED.nodes.getNode(config.cloudinaryAccount)

    if (!configurationNode) {
      this.error('Invalid configuration node')
      return
    }

    cloudinary.config({
      cloud_name: (configurationNode as any).accountName,
      api_key: (configurationNode as any).apiKey,
      api_secret: (configurationNode.credentials as any).apiSecret,
    })

    WorkerNode({
      fn: Setup({ node, cloudinary }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }

  RED.nodes.registerType('tweet-importer', TweetImporter, {
    credentials: {
      cloudinaryApiSecret: { type: 'password' },
    },
  })

  RED.httpAdmin.get(`/tweet-importer/:id`, async function (req: Request, res: Response) {
    const nodeId = req.params.id

    if (!nodeId) {
      res.redirect('/admin')
      return
    }

    res.send(renderTemplate({ nodeId, csv: '', totalVariations: 2 }))
  })

  function renderTemplate({
    nodeId,
    csv,
    errors,
    success,
    totalVariations,
  }: {
    nodeId: string
    csv: string
    errors?: Error[]
    success?: string
    totalVariations: number
  }): string {
    const form = [
      '<div class="bg-washed-blue pa3 ba bw1 b--light-gray br2 mt4">',
      `  <form action="/admin/tweet-importer/${nodeId}" method="POST">`,
      '    <p class="f5 mb0">Upload a csv file.</p>',
      '    <input id="csv-input" type="file" name="file" class="mv3 input-reset ba w-100 br2 bg-white f4 pv2 ph3 b--silver border-box"/>',
      '    <p class="f2 tc">OR</p>',
      '    <p class="f5 mb0">Copy and paste csv text here.</p>',
      `    <textarea id="csv-textarea" rows="5" name="csv" class="mv3 input-reset ba w-100 br2 bg-white f6 pv2 ph3 b--silver">${csv}</textarea>`,
      `    <p><label for='total-variations' class="f4 b">Total variations</label><input type='number' class="input-reset ba w3 br2 bg-white f4 pv2 ph3 b--silver border-box ml3" name="totalVariations" value="${totalVariations}"/></p>`,
      '    <div class="flex justify-between">',
      '    <input type="submit" id="submit" name="submit" value="Submit" class="input-reset bn pv2 bg-navy white db ttu b f4 br1 flex-auto mr3 pointer"/>',
      '    <input type="submit" id="preview" name="preview" value="Preview" class="input-reset bn pv2 bg-near-gray black-80 db w5 ttu b f4 br1 pointer"/>',
      '    </div>',
      '  </form>',
      '</div>',
    ]
      .map((it) => it.trim())
      .join('')

    const html = [
      `${form}`,
      `${
        Array.isArray(errors) && errors.length > 0
          ? `<ul class="overflow-auto">${errors
              .map((it) => {
                return `<li>${it.name}<pre>${it.message}</pre></li>`
              })
              .join('')}</ul>`
          : ''
      }`,
      success ? `<p class='b f3'>${success}</p>` : '',
    ].join('\n')
    return [
      `<!DOCTYPE html>`,
      `<head><title>Tweet Importer</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${tachyonsCss}</style></head>`,
      `<body class="sans-serif"><div class="mw7 center">${html}</div></body>`,
      `<script>!${readCsvFile.toString()}()</script>`,
    ].join('')
  }

  RED.httpAdmin.post(`/tweet-importer/:id`, async function (req: Request, res: Response): Promise<void> {
    const nodeId = req.params.id ?? ''
    const node = RED.nodes.getNode<Node>(nodeId)

    if (!node) {
      return res.redirect(`/admin/tweet-importer/${nodeId}`)
    }

    const isSubmit = isString(req.body.submit)
    const csvText = req.body.csv
    const totalVariations = isNumber(parseInt(req.body.totalVariations ?? ''))
      ? Math.min(parseInt(req.body.totalVariations ?? ''), 8)
      : 2

    if (!isString(csvText)) {
      return res.redirect(`/admin/tweet-importer/${nodeId}`)
    }

    const parsedTweets = csv2Tweets({ csv: csvText, totalVariations })

    if (parsedTweets instanceof Error) {
      res.send(renderTemplate({ nodeId, csv: csvText, errors: [parsedTweets], totalVariations }))
      return
    }

    if (parsedTweets.some((it) => it instanceof Error)) {
      res.send(
        renderTemplate({
          nodeId,
          csv: csvText,
          errors: parsedTweets.filter((it) => it instanceof Error) as Error[],
          totalVariations,
        }),
      )
      return
    }

    if (isSubmit) {
      node.receive({
        topic: 'IMPORT.V1',
        payload: {
          csv: csvText,
          totalVariations,
        },
      })
    }

    const allVariations = (parsedTweets as Tweet[]).flatMap((it) => it.variations)

    const images = allVariations
      .flatMap((it) => it.images)
      .map((it) => it.trim())
      .filter((it) => it.length > 0)

    const message = isSubmit ? 'Imported' : 'The import includes'

    res.send(
      renderTemplate({
        nodeId,
        csv: isSubmit ? '' : csvText,
        success: `${message} ${parsedTweets.length} tweets, ${allVariations.length} variations and ${images.length} images!`,
        totalVariations,
      }),
    )
  })

  function CloudinaryAccount(this: Node, config: NodeProperties & { accountName: string; apiKey: string }) {
    RED.nodes.createNode(this, config)
    ;(this as any).accountName = config.accountName
    ;(this as any).apiKey = config.apiKey
  }

  RED.nodes.registerType('Cloudinary account', CloudinaryAccount, {
    credentials: {
      apiSecret: { type: 'password' },
    },
  })
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
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

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}
