import test from 'tape'
import { Setup, Tweet } from './smarterqueue.lib'
import { add } from 'date-fns'
import { rrulestr } from 'rrule'

function noop() {}

test('it should queue', async (assert) => {
  assert.plan(13)

  const context = new MockContext()
  const input = Setup({
    node: { log: noop, error: noop, warn: noop, status: noop } as any,
    context,
    rrule: rrulestr('DTSTART:20180101T120000Z\nRRULE:FREQ=DAILY;INTERVAL=1;WKST=MO;BYDAY=MO,TU,WE'),
    circuitBreakerMaxEmit: 2,
    newDate: () => new Date('2018-01-01T12:00:00.000Z'),
  })
  await input(
    { _msgid: '1', topic: 'QUEUE.V1', payload: { variations: [{ text: '1', images: ['link1', 'link2'] }] } },
    () => assert.fail(),
    () => assert.pass(),
  )
  let keys = await context.keys()
  assert.equal(keys.length, 1)

  const tweet1 = await context.get<Tweet>(keys[0]!)
  const variations1 = Object.values(tweet1.variations)
  assert.equal(variations1[0]!.text, '1')
  assert.equal(variations1[0]!.images.join(','), 'link1,link2')
  assert.equal(variations1[0]!.scheduleAt, null)

  await input(
    {
      _msgid: '1',
      topic: 'QUEUE.V1',
      payload: {
        variations: [
          { text: '2', images: ['link3', 'link4'] },
          { text: '3', images: ['link5'] },
        ],
      },
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  keys = await context.keys()
  assert.equal(keys.length, 2)

  const tweet2 = await context.get<Tweet>(keys[1]!)
  const variations2 = Object.values(tweet2.variations)
  assert.equal(variations2[0]!.text, '2')
  assert.equal(variations2[0]!.images.join(','), 'link3,link4')
  assert.equal(variations2[0]!.scheduleAt, null)

  assert.equal(variations2[1]!.text, '3')
  assert.equal(variations2[1]!.images.join(','), 'link5')
  assert.equal(variations2[1]!.scheduleAt, null)

  assert.end()
})

test('it should publish', async (assert) => {
  assert.plan(7)

  const context = new MockContext()
  const input = Setup({
    node: { log: noop, error: noop, warn: noop, status: noop } as any,
    context,
    rrule: rrulestr('DTSTART:20180101T120000Z\nRRULE:FREQ=DAILY;INTERVAL=1;WKST=MO;BYDAY=MO,TU,WE'),
    circuitBreakerMaxEmit: 2,
    newDate: () => new Date('2021-02-09T12:00:00.000Z'),
  })
  const items = [
    {
      variations: [
        { text: '1', images: ['link1', 'link2'] },
        { text: '2', images: ['link3'] },
      ],
    },
  ]
  for (const item of items) {
    await input(
      { _msgid: '1', topic: 'QUEUE.V1', payload: item },
      () => assert.fail(),
      () => assert.pass(),
    )
  }

  const keys = await context.keys()
  const tweet = await context.get<Tweet>(keys[0]!)

  await input(
    {
      _msgid: '1',
      topic: 'PUBLISHED.V1',
      payload: { tweetId: 't1', id: `${tweet.id}#${Object.keys(tweet.variations)[0]}` },
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  await input(
    {
      _msgid: '1',
      topic: 'RESCHEDULE_ALL.V1',
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  await input(
    {
      _msgid: '1',
      topic: 'TICK.V1',
      payload: Date.now(),
    },
    (event) => {
      assert.equal(event.payload.text, '2')
      assert.equal(event.payload.id, `${tweet.id}#${Object.keys(tweet.variations)[1]}`)
      assert.equal(event.payload.images.join(','), 'link3')
    },
    () => assert.pass(),
  )
})

test('it should reschedule all', async (assert) => {
  assert.plan(7)

  const context = new MockContext()
  const input = Setup({
    node: { log: noop, error: noop, warn: noop, status: noop } as any,
    context,
    rrule: rrulestr('DTSTART:20180101T120000Z\nRRULE:FREQ=DAILY;INTERVAL=1;WKST=MO;BYDAY=MO,TU,WE'),
    circuitBreakerMaxEmit: 2,
    newDate: () => new Date('2021-02-09T12:00:00.000Z'),
  })
  const items = [
    {
      variations: [{ text: '1', images: ['link1', 'link2'] }],
    },
    {
      variations: [{ text: '2', images: ['link3'] }],
    },
    {
      variations: [{ text: '3', images: ['link4'] }],
    },
    {
      variations: [{ text: '4', images: [] }],
    },
  ]
  for (const item of items) {
    await input(
      { _msgid: '1', topic: 'QUEUE.V1', payload: item },
      () => assert.fail(),
      () => assert.pass('queue'),
    )
  }

  await input(
    {
      _msgid: '1',
      topic: 'RESCHEDULE_ALL.V1',
    },
    () => assert.fail(),
    () => assert.pass('reschedule #1'),
  )

  const keys = await context.keys()

  async function getSlot(tweetId: string): Promise<string> {
    const tweet = await context.get<Tweet>(tweetId)
    return Object.values(tweet.variations)[0]!.scheduleAt!
  }

  const previousSlots = await Promise.all(keys.map((it) => getSlot(it)))

  await input(
    {
      _msgid: '1',
      topic: 'RESCHEDULE_ALL.V1',
    },
    () => assert.fail(),
    () => assert.pass('reschedule #2'),
  )

  const currentSlots = await Promise.all(keys.map((it) => getSlot(it)))

  assert.deepEqual(currentSlots, previousSlots)

  assert.end()
})

test('it should gc', async (assert) => {
  assert.plan(5)

  const context = new MockContext()
  const input = Setup({
    node: { log: noop, error: noop, warn: noop, status: noop } as any,
    context,
    rrule: rrulestr('DTSTART:20180101T120000Z\nRRULE:FREQ=DAILY;INTERVAL=1;WKST=MO;BYDAY=MO,TU,WE'),
    circuitBreakerMaxEmit: 2,
    newDate: () => new Date('2021-02-09T12:00:00.000Z'),
  })
  const items = [
    {
      variations: [{ text: '1', images: ['link1', 'link2'] }],
    },
  ]
  for (const item of items) {
    await input(
      { _msgid: '1', topic: 'QUEUE.V1', payload: item },
      () => assert.fail(),
      () => assert.pass(),
    )
  }

  await input(
    {
      _msgid: '1',
      topic: 'RESCHEDULE_ALL.V1',
    },
    () => assert.fail(),
    () => assert.pass('schedule'),
  )

  const keys = await context.keys()
  const tweet = await context.get<Tweet>(keys[0]!)

  await input(
    {
      _msgid: '1',
      topic: 'PUBLISHED.V1',
      payload: { tweetId: 't1', id: `${tweet.id}#${Object.keys(tweet.variations)[0]}` },
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  await input(
    {
      _msgid: '1',
      topic: 'GARBAGE_COLLECTION.V1',
      payload: add(new Date(), { months: 1, days: 2 }).valueOf(),
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  assert.equal((await context.keys()).length, 0)

  assert.end()
})

test('it should reschedule all', async (assert) => {
  assert.plan(9)

  const context = new MockContext()
  const input = Setup({
    node: { log: noop, error: noop, warn: noop, status: noop } as any,
    context,
    rrule: rrulestr('DTSTART:20180101T120000Z\nRRULE:FREQ=DAILY;INTERVAL=1;WKST=MO;BYDAY=MO,TU,WE'),
    circuitBreakerMaxEmit: 2,
    newDate: () => new Date('2021-02-09T12:00:00.000Z'),
  })
  const items = [
    {
      variations: [
        { text: '1', images: [] },
        { text: '2', images: [] },
      ],
    },
    {
      variations: [
        { text: '3', images: [] },
        { text: '4', images: [] },
      ],
    },
    {
      variations: [
        { text: '5', images: [] },
        { text: '6', images: [] },
      ],
    },
  ]
  for (const item of items) {
    await input(
      { _msgid: '1', topic: 'QUEUE.V1', payload: item },
      () => assert.fail(),
      () => assert.pass('queue'),
    )
  }

  await input(
    {
      _msgid: '1',
      topic: 'RESCHEDULE_ALL.V1',
    },
    () => assert.fail(),
    () => assert.pass('reschedule #1'),
  )

  const keys = await context.keys()
  const tweet1 = await context.get<Tweet>(keys[0]!)
  const tweet2 = await context.get<Tweet>(keys[1]!)

  await input(
    {
      _msgid: '1',
      topic: 'PUBLISHED.V1',
      payload: { tweetId: 't1', id: `${tweet1.id}#${Object.keys(tweet1.variations)[0]}` },
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  await input(
    {
      _msgid: '1',
      topic: 'PUBLISHED.V1',
      payload: { tweetId: 't1', id: `${tweet2.id}#${Object.keys(tweet2.variations)[0]}` },
    },
    () => assert.fail(),
    () => assert.pass(),
  )

  await input(
    {
      _msgid: '1',
      topic: 'RESCHEDULE_ALL.V1',
    },
    () => assert.fail(),
    () => assert.pass('reschedule #2'),
  )

  await input(
    {
      _msgid: '1',
      topic: 'TICK.V1',
      payload: new Date('2021-02-10T12:30:00.000Z').valueOf(),
    },
    (event) => {
      assert.equal(event.payload.text, '5')
    },
    () => assert.pass(),
  )

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
