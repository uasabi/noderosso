import { FetchEvent, KVNamespace, Element, ElementHandler, DocumentHandler } from './common'
import { totp } from 'notp'

// declare var ASSETS: KVNamespace

// addEventListener('fetch', (event: any) => {
//   const cache = (caches as any).default as Cache
//   event.respondWith(handleRequest(event, cache, ASSETS))
// })

// const ASSETS_HEADERS_PERMITLIST = ['etag', 'cache-control', 'content-length', 'content-type']

// async function handleRequest(event: FetchEvent, cache: Cache, assets: KVNamespace) {
//   const url = new URL(event.request.url)

//   switch (event.request.method) {
//     case 'GET':
//     case 'HEAD':
//       return fetchAndCache(event, cache, assets)
//     default:
//       return fetchAndPassthrough(event, cache)
//   }
// }

// async function fetchAndPassthrough(event: FetchEvent, cache: Cache) {
//   const response = await fetch(event.request)

//   const headers = new Headers(response.headers)
//   headers.set('CF-Cache-Status', 'MISS')

//   return new Response(response.body, { headers, status: response.status })
// }

// async function fetchAndCache(event: FetchEvent, cache: Cache, assets: KVNamespace) {
//   const request = event.request
//   const url = new URL(request.url)
//   url.pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname
//   const newRequest = new Request(url.toString(), request)

//   let response = await cache.match(newRequest)

//   if (response) {
//     const headers = new Headers(response.headers)
//     headers.set('CF-Cache-Status', 'HIT')
//     return decorateResponse(request, new Response(response.body, { headers, status: 200 }))
//   }

//   const { value, metadata } = await assets.getWithMetadata<Record<string, string>>(url.toString(), 'stream')

//   if (value && metadata && !isEmpty(metadata)) {
//     const headers = new Headers()

//     headers.set('CF-Cache-Status', 'HIT')
//     Object.keys(metadata).forEach((key) => {
//       headers.set(key, metadata[key] as string)
//     })

//     return decorateResponse(request, new Response(value, { headers, status: 200 }))
//   }

//   response = await fetch(newRequest)
//   const headers = new Headers(response.headers)

//   if (response.status === 200) {
//     event.waitUntil(cache.put(request, response.clone()))
//     headers.set('CF-Cache-Status', 'HIT')

//     if (response.body && url.pathname.startsWith('/a/')) {
//       const metadata = {} as Record<string, string>
//       // Headers should be iterable... wrong type here
//       // https://developer.mozilla.org/en-US/docs/Web/API/Headers
//       for (const [key, value] of headers as any) {
//         if (value && ASSETS_HEADERS_PERMITLIST.includes(key)) {
//           metadata[key] = value
//         }
//       }
//       await assets.put(url.toString(), response.clone().body!, { metadata })
//     }
//   } else {
//     headers.set('CF-Cache-Status', 'MISS')
//   }

//   return decorateResponse(request, new Response(response.body, { headers, status: response.status }))
// }

// function isEmpty(obj: object): boolean {
//   return Object.keys(obj).length === 0
// }

// function decorateResponse(request: Request, response: Response): Response {
//   let country = request.headers.get('cf-ipcountry') ?? 'US'
//   country = ['T1', 'XX'].includes(country) ? 'US' : country
//   return new HTMLRewriter().transform(response)
// }

// // cannot import this. there is a bug
// declare class HTMLRewriter {
//   constructor()
//   public on(selector: string, handlers: ElementHandler): HTMLRewriter
//   public onDocument(selector: string, handlers: DocumentHandler): HTMLRewriter
//   public transform(response: Response): Response
// }

export function signEmail({ email, secret }: { email: string; secret: string }) {
  const key = Buffer.from(`${email}${secret}`).toString('hex')
  return totp.gen(key)
}

export function verifyCode({ email, secret, code }: { email: string; secret: string; code: string }) {
  const key = Buffer.from(`${email}${secret}`).toString('hex')
  return totp.verify(code, key, { window: 30 })
}
