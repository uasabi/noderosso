import test from 'tape'
import { Setup } from './lru-cache.lib'

test('it should release old keys', async (assert) => {
  assert.plan(4)

  const context = new MockContext()
  await context.set('1', { value: '1', time: Date.now() - 3000 })
  await context.set('2', { value: '2', time: Date.now() - 2000 })
  await context.set('3', { value: '3', time: Date.now() - 1000 })
  await context.set('4', { value: '4', time: Date.now() })

  let counter = 0
  const input = Setup({ ttl: 1500, context, node: { error: assert.fail } as any })
  await input(
    { topic: 'TICK.V1', _msgid: '1' },
    (message: unknown) => {
      assert.pass(JSON.stringify(message))
      counter += 1
    },
    assert.pass,
  )

  assert.equal(counter, 2)
  assert.end()
})

test('it should dedupe', async (assert) => {
  assert.plan(1)

  const context = new MockContext()
  await context.set('1', { value: { id: '1' }, time: Date.now() - 3000 })
  await context.set('2', { value: { id: '2' }, time: Date.now() - 2000 })

  let counter = 0
  const input = Setup({ ttl: 1500, context, node: { error: assert.fail } as any, dedupeField: 'id' })

  await input({ topic: 'SET.V1', payload: { id: '1' }, _msgid: '1' }, (message: unknown) => assert.fail(), assert.pass)
  assert.equal((await context.keys()).length, 2)
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
