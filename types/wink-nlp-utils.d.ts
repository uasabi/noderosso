declare module '~wink-nlp-utils/index' {
  export namespace string {
    export function tokenize0(input: string): string[]
    export function stem(input: string): string
    export function sentences(input: string): string[]
  }

  export namespace tokens {
    export function removeWords(input: string[], filter?: (word: string) => boolean): string[]
    export function stem(input: string[]): string[]
    export function bagOfWords(input: string[]): Record<string, number>
  }

  export namespace helper {}
}

declare module 'wink-nlp-utils' {
  import alias = require('~wink-nlp-utils/index')
  export = alias
}
