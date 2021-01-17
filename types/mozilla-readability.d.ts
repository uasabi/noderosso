declare module '~@mozilla/readability/index' {
  export class Readability {
    constructor(document: Document)
    parse(): Article
  }

  export interface Article {
    title?: string
    content?: string
    textContent?: string
    length: number
    excerpt?: string
    byline?: string
    dir?: string
  }
}

declare module '@mozilla/readability' {
  import alias = require('~@mozilla/readability/index')
  export = alias
}
