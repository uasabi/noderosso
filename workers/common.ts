type KVValue<Value> = Promise<Value | null>
type KVValueWithMetadata<Value, Metadata> = Promise<{
  value: Value | null
  metadata: Metadata | null
}>

export interface KVNamespace {
  get(key: string): KVValue<string>
  get(key: string, type: 'text'): KVValue<string>
  get<ExpectedValue = unknown>(key: string, type: 'json'): KVValue<ExpectedValue>
  get(key: string, type: 'arrayBuffer'): KVValue<ArrayBuffer>
  get(key: string, type: 'stream'): KVValue<ReadableStream>

  getWithMetadata<Metadata = unknown>(key: string): KVValueWithMetadata<string, Metadata>
  getWithMetadata<Metadata = unknown>(key: string, type: 'text'): KVValueWithMetadata<string, Metadata>
  getWithMetadata<ExpectedValue = unknown, Metadata = unknown>(
    key: string,
    type: 'json',
  ): KVValueWithMetadata<ExpectedValue, Metadata>
  getWithMetadata<Metadata = unknown>(key: string, type: 'arrayBuffer'): KVValueWithMetadata<ArrayBuffer, Metadata>
  getWithMetadata<Metadata = unknown>(key: string, type: 'stream'): KVValueWithMetadata<ReadableStream, Metadata>

  put(
    key: string,
    value: string | ReadableStream | ArrayBuffer | FormData,
    options?: {
      expiration?: string | number
      expirationTtl?: string | number
      metadata?: any
    },
  ): Promise<void>

  delete(key: string): Promise<void>

  list(options?: {
    prefix?: string
    limit?: number
    cursor?: string
  }): Promise<{
    keys: { name: string; expiration?: number; metadata?: unknown }[]
    list_complete: boolean
    cursor: string
  }>
}

export interface FetchEvent extends ExtendableEvent {
  readonly clientId: string
  readonly preloadResponse: Promise<any>
  readonly replacesClientId: string
  readonly request: Request
  readonly resultingClientId: string
  respondWith(r: Response | Promise<Response>): void
}

interface ExtendableEvent extends Event {
  waitUntil(f: any): void
}

export declare class HTMLRewriter {
  constructor()
  public on(selector: string, handlers: ElementHandler): HTMLRewriter
  public onDocument(selector: string, handlers: DocumentHandler): HTMLRewriter
  public transform(response: Response): Response
}

export interface ElementHandler {
  element(element: Element): void
  comments(comment: Comment): void
  text(text: Text): void
}

export interface DocumentHandler {
  doctype(doctype: Doctype): void
  comments(comment: Comment): void
  text(text: Text): void
}

export interface Element {
  namespaceURI: string
  tagName: string
  readonly attributes: Iterator<{ name: string; value: string }>
  removed: boolean

  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): Element
  removeAttribute(name: string): Element
  before(content: string, options?: ContentOptions): Element
  after(content: string, options?: ContentOptions): Element
  prepend(content: string, options?: ContentOptions): Element
  append(content: string, options?: ContentOptions): Element
  replace(content: string, options?: ContentOptions): Element
  setInnerContent(content: string, options?: ContentOptions): Element
  remove(): Element
  removeAndKeepContent(): Element
}

interface Comment {
  removed: boolean
  text: string

  before(content: string, options?: ContentOptions): Element
  after(content: string, options?: ContentOptions): Element
  replace(content: string, options?: ContentOptions): Element
  remove(): Element
}

interface Doctype {
  readonly name: string | null
  readonly publicId: string | null
  readonly systemId: string | null
}

interface Text {
  removed: boolean
  readonly text: string
  readonly lastInTextNode: boolean

  before(content: string, options?: ContentOptions): Element
  after(content: string, options?: ContentOptions): Element
  replace(content: string, options?: ContentOptions): Element
  remove(): Element
}

interface ContentOptions {
  html: boolean
}
