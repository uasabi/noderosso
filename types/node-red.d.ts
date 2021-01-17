declare module '~node-red/index' {
  import { EventEmitter } from 'events'
  import { Router } from 'express'

  export interface Red {
    nodes: Nodes
    log: any
    settings: any
    events: any
    util: Util
    httpAdmin: Router
    auth: any
    comms: any
    library: any
    httpNode: Router
    server: any
    version(): string
  }

  export interface Util {
    cloneMessage<T extends object>(message: T): T
    generateId(): string
  }

  export interface Node extends EventEmitter, NodeProperties {
    credentials: object
    updateWires(wires: string[][]): void
    context(): Context
    close(isBeingRemoved: boolean): Promise<void>
    send<T extends object>(message: T[]): void
    send<T extends object>(message: T): void
    receive<T extends object>(message: T): void
    log(message: string): void
    warn(message: string): void
    error(message: string): void
    debug(message: string): void
    trace(message: string): void
    metric<T extends object>(eventname: string, message: T, metricValue: unknown): unknown
    metric(): unknown
    status(status: NodeStatus | Partial<ClearNodeStatus>): void
    on(
      event: 'input',
      fn: (message: object, send: <T = object>(message: T | T[]) => void, done: () => void) => void,
    ): this
    on(event: 'close', fn: (removed: boolean, done: () => void) => void): this
  }

  export interface NodeProperties {
    id: NodeId
    type: NodeType
    name: string
  }

  export type NodeId = string
  export type NodeType = string

  export type StatusFill = 'red' | 'green' | 'yellow' | 'blue' | 'grey'
  export type StatusShape = 'ring' | 'dot'

  export interface NodeStatus {
    fill: StatusFill
    shape: StatusShape
    text: string
  }

  export interface ClearNodeStatus {
    fill: undefined
    shape: undefined
    text: undefined
  }

  export interface Nodes {
    createNode(node: Node, props: NodeProperties): void
    getNode<T extends Node>(id: NodeId): T | null
    eachNode(callback: (node: NodeProperties) => any): void

    addCredentials(id: NodeId, creds: object): void
    getCredentials(id: NodeId): object
    deleteCredentials(id: NodeId): void
    registerType<T extends Node, U extends NodeProperties>(
      type: string,
      constructor: (this: T, props: U) => unknown,
      opts?: Partial<Options>,
    ): void
  }

  export interface Context {
    set<T = unknown>(name: string, value: T): void
    set<T = unknown>(name: string, value: T, fn: (err: Error) => void): void
    set(name: string, fn: (err: Error) => void): void
    set(name: string, fn?: (err: Error) => void): void
    get<T = unknown>(name: string): T
    get<T = unknown>(name: string, fn: (error: Error, value: T) => void): void
    keys(): string[]
    keys(fn: (error: Error, value: string[]) => void): void
  }

  export interface Options {
    credentials: Record<string, unknown>
    settings: Record<string, unknown>
  }
}

declare module 'node-red' {
  import alias = require('~node-red/index')
  export = alias
}
