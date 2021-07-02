declare module '~notp/index' {
  export module hotp {
    function gen(key: string, options?: { counter: number }): string
    function verify(token: string, key: string, options?: { time?: number; window?: number }): boolean
  }
  export module totp {
    function gen(key: string, options?: { time: number }): string
    function verify(token: string, key: string, options?: { counter?: number; window?: number }): boolean
  }
}

declare module 'notp' {
  import alias = require('~notp/index')
  export = alias
}
