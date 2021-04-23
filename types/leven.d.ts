declare module '~leven/index' {
  export default function leven(textA: string, textB: string): number
}

declare module 'leven' {
  import alias = require('~leven/index')
  export = alias
}
