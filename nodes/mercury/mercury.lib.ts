import hastParser from 'hast-util-raw'
import { select, selectAll } from 'hast-util-select'
import toString from 'hast-util-to-string'
import { Node } from 'node-red'
import { Actions, Events, Event } from './mercury.common'
import { inspect } from 'util'
import { URL } from 'url'
import { axios, prettyAxiosErrors } from '../axios'
import { summarice } from '@noderosso/summarice'
import * as Hast from 'hast'
import * as chrono from 'chrono-node'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'

import { promises } from 'fs'

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

let readabilityScript: Promise<string | null> = Promise.resolve(null)

if (process.env['BAZEL_NODE_RUNFILES_HELPER']) {
  const readabilityPath = require(process.env['BAZEL_NODE_RUNFILES_HELPER']).resolve(
    'npm/node_modules/@mozilla/readability/Readability.js',
  )
  if (readabilityPath) {
    readabilityScript = promises.readFile(readabilityPath, 'utf8').catch(() => null)
  }
}

export function Setup({ node }: { node: Node }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FETCH.V1': {
        const startTime = process.hrtime()
        try {
          const url = new URL(action.payload.url)
          node.log(`Processing ${url.toString()}`)
          node.status({ fill: 'yellow', shape: 'dot', text: `Processing ${url.toString()} ${time()}` })

          const html = cleanString(await fetchPage(url))
          const hast = parseHtml(html)
          const { content, contentAsText } = await extractContent(url.toString())
          const contentAsHast = parseHtml(content ?? '')
          const parsedTitle = extractTitle(hast)

          const summary = summarice(selectAll('p', contentAsHast).map((it) => toString(it)))
            .map((it) => `<p>${it.sentence}</p>`)
            .join('')

          send(
            Event.message({
              url: url.toString(),
              title: action.payload.title || parsedTitle,
              parsedTitle,
              publishedDate:
                extractDate(hast)?.toISOString() || action.payload.publishedDate || new Date().toISOString(),
              content,
              contentAsText,
              sourceLink: extractSourceLink(action.payload.content ?? ''),
              description: extractDescription(hast),
              ogDescription: undefined,
              summary: isStringNonEmpty(summary) ? summary : undefined,
            }),
          )
          node.log(`Processed ${url.toString()} in ${process.hrtime(startTime)[0]} seconds`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Last processed ${url.toString()} in ${process.hrtime(startTime)[0]} seconds`,
          })
        } catch (error) {
          send(
            Event.message({
              url: action.payload.url.trim(),
              title: action.payload.title,
              parsedTitle: undefined,
              content: `Error ${inspect(error)}`,
              contentAsText: `Error ${inspect(error)}`,
              publishedDate: action.payload.publishedDate || new Date().toISOString(),
              sourceLink: undefined,
              description: action.payload.content,
              ogDescription: undefined,
              summary: undefined,
            }),
          )
          node.error(`Failed processing: ${inspect(error)}`)
          node.status({ fill: 'red', shape: 'dot', text: `Failed ${action.payload.url} ${time()}` })
        }
        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
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

function cleanString(input: string) {
  input = input.replace(/\uFFFD/g, ' ')
  let output = ''
  for (var i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i)
    } else {
      output += `&#${input.charCodeAt(i)};`
    }
  }
  return output
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isStringNonEmpty(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

function assertUnreachable(x: never): void {}

function onlyUnique(value: string, index: number, self: string[]) {
  return self.indexOf(value) === index
}

function time() {
  return new Date().toISOString().substr(11, 5)
}

async function fetchPage(url: URL): Promise<string> {
  let contentType = ''
  try {
    const peek = await axios.head(url.toString())
    contentType = peek.headers['content-type'] ?? ''
  } catch (error) {
    const skipErrors = () => {
      contentType = 'text'
    }
    prettyAxiosErrors(error)({
      not200: skipErrors,
      noResponse: skipErrors,
      orElse: skipErrors,
    })
  }

  if (!contentType.startsWith('text')) {
    throw `The content type of the page is ${contentType}`
  }

  let content = ''
  try {
    const response = await axios.get<string | null | undefined>(url.toString())
    content = response.data ?? ''
  } catch (error) {
    prettyAxiosErrors(error)({
      not200: (response) => {
        throw `GET ${url.toString()} ${response.status}\n${inspect(response.headers)}\n${inspect(response.data)}`
      },
      noResponse: (request) => {
        throw `No response: GET ${url.toString()}`
      },
      orElse: (message) => {
        throw `GET ${url.toString()} unknown error message ${message}`
      },
    })
  }

  return content
}

function extractTitle(hast: Hast.Root): string | undefined {
  // list borrowed from https://github.com/microlinkhq/metascraper/blob/c83efa9a2b429b5e077e0a4d9c808dad8b939510/packages/metascraper-title/index.js
  return extractAsString(
    [
      () => $prop('meta[property="og:title"]', hast),
      () => $prop('meta[name="twitter:title"]', hast),
      () => $element('title', hast),
      () => $jsonld((it) => it.headline, hast),
      () => $element('.post-title', hast),
      () => $element('.entry-title', hast),
      () => $element('h1[class*="title"] a', hast),
      () => $element('h1[class*="title"]', hast),
    ] as Array<() => string | undefined>,
    hast,
  )
}

function extractDescription(hast: Hast.Root): string | undefined {
  return extractAsString(
    [
      () => $jsonld((it) => it.description, hast),
      () => $prop('meta[property="og:description"]', hast),
      () => $prop('meta[name="twitter:description"]', hast),
      () => $prop('meta[name="description"]', hast),
      () => $prop('meta[itemprop="description"]', hast),
      () => $jsonld((it) => it.articleBody, hast),
    ] as Array<() => string | undefined>,
    hast,
  )
}

function extractDate(hast: Hast.Root): Date | undefined {
  return extractAsDate(
    [
      () => $jsonld((it) => it.dateModified, hast),
      () => $jsonld((it) => it.datePublished, hast),
      () => $jsonld((it) => it.dateCreated, hast),
      () => $prop('meta[property*="updated_time"]', hast),
      () => $prop('meta[property*="modified_time"]', hast),
      () => $prop('meta[property*="published_time"]', hast),
      () => $prop('meta[property*="release_date"]', hast),
      () => $prop('meta[name="date"]', hast),
      () => $prop('[itemprop*="datemodified"]', hast),
      () => $prop('[itemprop="datepublished"]', hast),
      () => $prop('[itemprop*="date"]', hast),
      () => $prop('time[itemprop*="date"]', hast, 'datetime'),
      () => $prop('time[datetime]', hast, 'datetime'),
      () => $prop('time[datetime][pubdate]', hast, 'datetime'),
      () => $prop('meta[name*="dc.date"]', hast),
      () => $prop('meta[name*="dc.date.issued"]', hast),
      () => $prop('meta[name*="dc.date.created"]', hast),
      () => $prop('meta[name*="dcterms.date"]', hast),
      () => $prop('[property*="dc:date"]', hast),
      () => $prop('[property*="dc:created"]', hast),
      () => $filter('[class*="byline"]', hast),
      () => $filter('[class*="dateline"]', hast),
      () => $filter('[id*="metadata"]', hast),
      () => $filter('[class*="metadata"]', hast),
      () => $filter('[id*="date"]', hast),
      () => $filter('[class*="date"]', hast),
      () => $filter('[id*="publish"]', hast),
      () => $filter('[class*="publish"]', hast),
      () => $filter('[id*="post-timestamp"]', hast),
      () => $filter('[class*="post-timestamp"]', hast),
      () => $filter('[id*="post-meta"]', hast),
      () => $filter('[class*="post-meta"]', hast),
      () => $filter('[id*="time"]', hast),
      () => $filter('[class*="time"]', hast),
    ] as Array<() => string | undefined>,
    hast,
  )
}

function extractAsString(candidates: Array<() => string | undefined>, hast: Hast.Root): string | undefined {
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]

    if (!candidate) {
      continue
    }

    const element = candidate.call(null)
    if (isStringNonEmpty(element)) {
      return element
    }
  }

  return undefined
}

function extractAsDate(candidates: Array<() => string | undefined>, hast: Hast.Root): Date | undefined {
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]

    if (!candidate) {
      continue
    }

    const date = chrono.parseDate(candidate.call(null) ?? '')
    if (date) {
      return date
    }
  }

  return undefined
}

function $prop(selector: string, hast: Hast.Root, prop = 'content'): string | undefined {
  const element = select<Hast.Element>(selector, hast)
  return element && isStringNonEmpty(element.properties?.[prop]) ? (element.properties[prop] as string) : undefined
}

function $filter(selector: string, hast: Hast.Root): string | undefined {
  const items = selectAll<Hast.Element>(selector, hast)
    .map((it) => toString(it))
    .filter((it) => isStringNonEmpty(it))
  return items.length === 0 ? undefined : items[0]
}

function $element(selector: string, hast: Hast.Root): string | undefined {
  const element = select<Hast.Element>(selector, hast)
  return element ? toString(element) : undefined
}

function $jsonld(fn: (schema: any) => string | undefined, hast: Hast.Root): string | undefined {
  const ldJson = selectAll<Hast.Element>('script[type="application/ld+json"]', hast).map((it) => {
    const child = it.children[0] as Hast.Text
    try {
      const schema = JSON.parse(child.value)
      return fn(schema)
    } catch {
      return undefined
    }
  })
  return ldJson.find((it) => !!it)
}

function extractSourceLink(content: string): string | undefined {
  const regexes = [
    /href="(.*?)"/gim,
    /href=\\"(.*?)\\"/gim,
    /href=\&quot\;(.*?)\&quot\;/gim,
    /href=\&#34\;(.*?)\&#34\;/gim,
    /href=(http.*?)>/gim,
  ]
  const urls = isStringNonEmpty(content)
    ? regexes
        .reduce((acc, regex) => {
          const matches = [...Array.from((content as any).matchAll(regex))] as Array<string[]>
          return [...matches.map((it) => it[1]!), ...acc]
        }, [] as string[])
        .filter((it) => {
          try {
            new URL(it)
            return true
          } catch (error) {
            return false
          }
        })
        .filter(onlyUnique)
    : []
  const sourceLink = urls.length === 0 ? undefined : urls[0]
  return sourceLink
}

async function extractContent(
  url: string,
): Promise<{ content: string | undefined; contentAsText: string | undefined }> {
  const script = await readabilityScript
  if (!script) {
    return { content: undefined, contentAsText: undefined }
  }

  const browser = await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:3000' })
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0' })
    const res = (await page.evaluate(`(() => {
      ${script}
      const article = new Readability(document).parse()
      return article ? { content: article.content, contentAsText: article.textContent } : {content: undefined, contentAsText: undefined}
    })()`)) as { content: string | undefined; contentAsText: string | undefined }
    browser.disconnect()
    return res
  } catch (error) {
    browser.disconnect()
    throw error
  }
}
