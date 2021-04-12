import test from 'tape'
import { Tweet } from './tweet-importer.common'
import { csv2Tweets } from './tweet-importer.lib'

test('it should throw error', async (assert) => {
  assert.ok(csv2Tweets({ csv: ',,,,,,,,,,,\n,,\n' }) instanceof Error)
  assert.end()
})

test('it should parse and ignore the first line', async (assert) => {
  const csv = `link,total_sources,sources,description,image_1,image_2,categories
  https://altoros.com/blog/kubernetes-networking-writing-your-own-simple-cni-plug-in-with-bash,1,https://www.reddit.com/r/kubernetes/comments/ka3qo2/how_does_the_cni_plugin_running_in_a_pod_create_a/,Kubernetes Networking: how to write your own CNI plug-in with bash,https://www.altoros.com/blog/wp-content/uploads/2018/08/Kubernetes-Network-Model-Configuration-Management-v5.gif,,networking`

  const tweets = csv2Tweets({ csv })

  if (tweets instanceof Error) {
    assert.fail()
    assert.end()
    return
  }

  assert.equal(tweets.length, 1)
  assert.equal((tweets[0] as Tweet | undefined)?.variations.length, 2)
  assert.ok(tweets.every((it) => !(it instanceof Error)))
  assert.end()
})

test('it should ignore broken tweets', async (assert) => {
  const csv = `link,total_sources,sources,description,image_1,image_2,categories
  not_a_link,1,https://www.reddit.com/r/kubernetes/comments/ka3qo2/how_does_the_cni_plugin_running_in_a_pod_create_a/,Kubernetes Networking: how to write your own CNI plug-in with bash,https://www.altoros.com/blog/wp-content/uploads/2018/08/Kubernetes-Network-Model-Configuration-Management-v5.gif,,networking`

  const tweets = csv2Tweets({ csv })

  if (tweets instanceof Error) {
    assert.fail()
    assert.end()
    return
  }

  assert.equal(tweets.length, 1)
  assert.ok(tweets.some((it) => it instanceof Error))
  assert.end()
})
