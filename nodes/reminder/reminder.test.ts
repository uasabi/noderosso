import test from 'tape'
import { Setup } from './reminder.lib'
import { NodeStatus } from 'node-red'

test('Node setup', async (assert) => {
  const node = new MockNode() as any
  const input = Setup({ node })

  assert.end()
})

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

class MockNode {
  log(message: string) {}
  warn(message: string) {}
  error(message: string) {}
  status(args: NodeStatus) {}
}
