declare module '~wink-distance/index' {
  export namespace bow {
    export function cosine(a: Record<string, number>, b: Record<string, number>): number
  }
}

declare module 'wink-distance' {
  import alias = require('~wink-distance/index')
  export = alias
}
