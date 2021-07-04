import { Context } from 'node-red'

export interface AsyncContext {
  set<T = unknown>(name: string, value: T): Promise<void>
  set(name: string): Promise<void>
  get<T = unknown>(name: string): Promise<T | undefined>
  keys(): Promise<string[]>
}

export function asyncContext(context: Context): AsyncContext {
  return {
    set<T>(name: string, value?: T): Promise<void> {
      if (/\./i.test(name)) {
        console.log('WARNING. Context does not play nicely with DOTs. ', name)
      }
      return new Promise((resolve, reject) => {
        context.set(name, value, (error: Error) => {
          error ? reject(error) : resolve()
        })
        return
      })
    },
    get<T>(name: string): Promise<T | undefined> {
      return new Promise<T | undefined>((resolve, reject) => {
        context.get<T | undefined>(name, (error, value) => {
          error ? reject(error) : resolve(value)
        })
      })
    },
    keys(): Promise<string[]> {
      return new Promise<string[]>((resolve, reject) => {
        context.keys((error, keys) => {
          error ? reject(error) : resolve(keys)
        })
      })
    },
  }
}
