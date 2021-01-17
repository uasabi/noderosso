import test from 'tape'
import { Channel, Loop } from './channel'

test('it should only trigger once', (assert) => {
  assert.plan(1)
  const q = new Channel()
  q.take(() => assert.pass())
  q.put()
  q.put()
  assert.end()
})

test('it should only trigger none', (assert) => {
  assert.plan(0)
  const q = new Channel()
  q.take(() => assert.pass())
  assert.end()
})

test('it should only trigger after the fact', (assert) => {
  assert.plan(1)
  const q = new Channel()
  q.put()
  q.put()
  q.take(() => assert.pass())
  q.put()
  assert.end()
})

test('it should only trigger twice', (assert) => {
  assert.plan(2)
  const q = new Channel()
  q.put()
  q.put()
  q.take(() => assert.pass())
  q.take(() => assert.pass())
  q.put()
  assert.end()
})

test('it should unsubscribe', async (assert) => {
  assert.plan(2)
  let counter = 0
  const q = new Channel()
  const unsubscribe = Loop(
    q,
    function onItem(values) {
      switch (counter) {
        case 0: {
          assert.deepEqual(values, ['one'])
          counter++
          break
        }
        case 1: {
          assert.deepEqual(values, ['two'])
          counter++
          break
        }
        default:
          assert.fail(`Found [${values.join(', ')}]`)
          break
      }
    },
    (error) => assert.fail(error.message),
  )
  q.put('one')
  await wait(10)
  q.put('two')
  await wait(10)
  unsubscribe()
  await wait(10)
  q.put('three')
  assert.end()
})

async function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
