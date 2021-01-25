import test from 'tape'
class MockContext {
  private cache = new Map<string, unknown>()
  async set<T = unknown>(key: string, value?: T) {
    if (value === undefined) {
      this.cache.delete(key)
      return
    }
    this.cache.set(key, value)
  }
  async get<T = unknown>(key: string): Promise<T> {
    return this.cache.get(key) as any
  }
  async keys() {
    return Array.from(this.cache.keys())
  }
}
