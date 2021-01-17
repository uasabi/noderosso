declare module '~unist-util-visit/index' {
  import { Node } from 'unist'
  export default function visit(tree: Node, fn: (node: Node) => void, reverse?: boolean): void
  export default function visit<T extends Node>(tree: Node, is: string, fn: (node: T) => void, reverse?: boolean): void
}

declare module 'unist-util-visit' {
  import alias = require('~unist-util-visit/index')
  export = alias
}
