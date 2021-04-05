import test from 'tape'
import { Setup } from './circular-buffer.lib'

test('it should buffer', async (assert) => {
  assert.plan(7)

  const context = new MockContext()
  const input = Setup({ maxSize: 3, context, node: { status: () => {} } as any })

  await input(
    { payload: 1, topic: 'ADD.V1', _msgid: '1' },
    () => assert.fail(),
    () => assert.pass('first'),
  )
  await wait(10)
  await input(
    { payload: 2, topic: 'ADD.V1', _msgid: '1' },
    () => assert.fail(),
    () => assert.pass('second'),
  )
  await wait(10)
  await input(
    { payload: 3, topic: 'ADD.V1', _msgid: '1' },
    (message) => {
      assert.deepEqual(message, { topic: 'BATCH.V1', payload: [3, 2, 1] })
    },
    () => assert.pass('third'),
  )
  await wait(10)
  let invocation = 0
  await input(
    { payload: 4, topic: 'ADD.V1', _msgid: '1' },
    (message) => {
      if (invocation === 0) {
        assert.deepEqual(message, { topic: 'BATCH.V1', payload: [4, 3, 2] })
        invocation++
      } else {
        assert.deepEqual(message, { topic: 'OVERFLOW.V1', payload: 1 })
      }
    },
    () => assert.pass('fourth'),
  )
  assert.end()
})

test.only('it should dedupe', async (assert) => {
  assert.plan(5)

  const context = new MockContext()
  const input = Setup({ maxSize: 5, context, node: { status: () => {} } as any, dedupeField: 'id' })

  await input(
    { payload: 1, topic: 'ADD.V1', _msgid: '1' },
    () => assert.fail(),
    () => assert.pass('first'),
  )
  await wait(10)
  await input(
    { payload: 1, topic: 'ADD.V1', _msgid: '1' },
    () => assert.fail(),
    () => assert.pass('second'),
  )
  await wait(10)
  await input(
    { payload: { id: '1' }, topic: 'ADD.V1', _msgid: '1' },
    () => assert.fail(),
    () => assert.pass('third'),
  )
  await wait(10)
  await input(
    { payload: { id: '1' }, topic: 'ADD.V1', _msgid: '1' },
    () => assert.fail(),
    () => assert.pass('fourth'),
  )

  assert.equal((await context.keys()).length, 3)

  assert.end()
})

function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

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
