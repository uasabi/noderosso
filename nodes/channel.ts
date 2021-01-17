export class Channel {
  private subscribers: Function[] = []
  private values: any[] = []
  private inProgress = false
  public put<T>(value?: T) {
    this.values.push(value)
    this.runTick()
  }
  public take<T>(fn: (args: T[]) => void) {
    this.subscribers.push(fn)
    this.runTick()
  }
  private runTick() {
    if (this.inProgress) {
      return
    }
    if (this.values.length === 0) {
      return
    }
    if (this.subscribers.length === 0) {
      return
    }
    this.inProgress = true
    const args = this.values.slice(0)
    this.values = []
    const subscribers = this.subscribers.slice(0)
    this.subscribers = []
    subscribers.forEach((it) => it.call(null, args))
    this.inProgress = false
    this.runTick()
  }
}

export function Loop<T>(channel: Channel, fn: (values: T[]) => Promise<void> | void, onError: (error: Error) => void) {
  let isSubscribed = true

  internalLoop()

  return function unsubscribe() {
    isSubscribed = false
  }

  function internalLoop() {
    channel.take<T>(async (items) => {
      if (!isSubscribed) {
        return
      }
      try {
        await fn(items)
      } catch (error) {
        onError(error)
      }
      if (isSubscribed) {
        internalLoop()
      }
    })
  }
}
