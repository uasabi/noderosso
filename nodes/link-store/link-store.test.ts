import test from 'tape'
import { filterQuerystring, filterUnwantedLinks } from './link-store.lib'

test('it should filter query strings', (assert) => {
  const url = filterQuerystring('https://a.com?utm_source=1&response=ok')
  assert.equal(url, 'https://a.com/?response=ok')
  assert.end()
})

test('filter unwanted links', (assert) => {
  assert.deepEqual(
    [
      'https://np.reddit.com/message/compose',
      'http://np.reddit.com/r/RemindMeBot',
      'https://np.reddit.com/u/LinkifyBot/something',
    ].filter(filterUnwantedLinks),
    [],
  )
  assert.end()
})
