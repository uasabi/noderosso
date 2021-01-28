import test from 'tape'
import { filterQuerystring } from './link-store.lib'

test('it should filter query strings', (assert) => {
  const url = filterQuerystring('https://a.com?utm_source=1&response=ok')
  assert.equal(url, 'https://a.com/?response=ok')
  assert.end()
})
