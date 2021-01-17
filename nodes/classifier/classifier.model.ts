import hastParser from 'hast-util-raw'
import { selectAll } from 'hast-util-select'
import toString from 'hast-util-to-string'
import * as Hast from 'hast'
import { URL } from 'url'
import Classifier from 'wink-naive-bayes-text-classifier'
import { string, tokens } from 'wink-nlp-utils'

export async function trainModel(
  dataset: { text: string; keywords: string[]; category: string; language: string }[],
): Promise<GenericClassifier> {
  let isReady = true
  const classifier = new Classifier()
  dataset.forEach((it) => classifier.learn(standardise([...tokenize(it), ...it.keywords]), it.category))
  try {
    classifier.consolidate()
  } catch {
    isReady = false
  }
  return {
    classify: (it) => {
      const tokens = standardise([...tokenize(it), ...it.keywords])
      return isReady ? classifier.predict(tokens) : 'invalid'
    },
  }
}

export interface GenericClassifier {
  classify(args: { text: string; keywords: string[]; language: string }): string
}

export function tokenize({ text, language }: { text: string; language: string }): string[] {
  const hast = parseHtml(text)
  const links = selectAll<Hast.Element>('a', hast)
  const hostnames = links
    .filter((it) => isString(it.properties?.href))
    .map((it) => it.properties.href as string)
    .map((it) => {
      try {
        return new URL(it).hostname
      } catch (error) {
        return ''
      }
    })
    .filter((it) => it.length > 0)
  const alts = selectAll<Hast.Element>('[alt]', hast)
    .filter((it) => isString(it.properties?.alt))
    .map((it) => it.properties.alt as string)
    .map((it) => pipeline(it, language))
    .reduce((acc, it) => [...acc, ...it], [])
  const titles = selectAll<Hast.Element>('[title]', hast)
    .filter((it) => isString(it.properties?.title))
    .map((it) => it.properties.title as string)
    .map((it) => pipeline(it, language))
    .reduce((acc, it) => [...acc, ...it], [])
  selectAll<Hast.Element>('code', hast).forEach((it) => {
    it.children = []
  })

  return [...pipeline(toString(hast), language), ...hostnames, ...alts, ...titles]
}

function pipeline(input: string, language: string): string[] {
  let output = string.tokenize0(input)
  output = tokens.removeWords(output)
  output = tokens.stem(output)
  return output
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

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function onlyUnique(value: string, index: number, self: string[]) {
  return self.indexOf(value) === index
}

function standardise(value: string[]) {
  return value.filter(onlyUnique).map((it) => it.toLowerCase())
}
