import test from 'tape'
import { Setup } from './web-watcher.lib'
import { NodeStatus } from 'node-red'
import { createServer, Server } from 'http'

let server: Server
let message = `<div id="content"><p>one</p></div>`
const port = 54321

test('setup', (assert) => {
  server = createServer((req, res) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    res.end(`${message}\n`)
  })

  server.listen(port, () => {
    assert.comment(`Server running on port ${port}`)
    assert.end()
  })
})

test('detect a change', async (assert) => {
  assert.plan(5)

  const context = new MockContext()
  const node = new MockNode() as any
  const input = Setup({ selector: '#content', url: `http://localhost:${port}`, context, node })

  await input(
    { topic: 'FETCH.V1', _msgid: '1' },
    (message) => {
      assert.fail()
    },
    () => assert.pass(),
  )
  await input(
    { topic: 'FETCH.V1', _msgid: '1' },
    (message) => {
      assert.fail()
    },
    () => assert.pass(),
  )
  message = `<div id="content"><p>one</p><p>two</p></div>`
  await input(
    { topic: 'FETCH.V1', _msgid: '1' },
    (message) => {
      assert.equal(message.payload.current, `<div id="content"><p>one</p><p>two</p></div>`)
    },
    () => assert.pass(),
  )
  message = `<div id="content"><p>one</p><p>two</p></div><div>three</div>`
  await input(
    { topic: 'FETCH.V1', _msgid: '1' },
    (message) => {
      assert.fail()
    },
    () => assert.pass(),
  )

  assert.end()
})

test('tear down', (assert) => {
  server.close(() => {
    assert.end()
  })
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
