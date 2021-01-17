declare module '~unist-diff/index' {
  import { Node } from 'unist'
  export default function diff<L extends Node>(left: L, right: Node): Record<string, Patch | Patch[]> & { left: L }
  export type Patch = Remove | Insert | Replace | Props | Text | Order

  export interface Remove {
    type: 'remove'
    left: Node
    right: null
  }
  export interface Insert {
    type: 'remove'
    left: null
    right: Node
  }
  export interface Replace {
    type: 'replace'
    left: Node
    right: Node
  }
  export interface Props {
    type: 'props'
    left: Node
    right: Record<string, string>
  }
  export interface Text {
    type: 'text'
    left: Node
    right: Node
  }
  export interface Order {
    type: 'order'
    left: Node
    right: {
      inserts: { left: Node; right: number }[]
      removes: { left: Node; right: number }[]
    }
  }
}

declare module 'unist-diff' {
  import alias = require('~unist-diff/index')
  export = alias
}
