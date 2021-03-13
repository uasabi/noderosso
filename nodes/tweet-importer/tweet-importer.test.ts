import test from 'tape'
import { csv2Tweets } from './tweet-importer.lib'

test('it should throw error', async (assert) => {
  const cases = [
    `link,total_sources,sources,description,image_1image_2
    https://learnk8s.io,1,https://www.reddit.com/r/kubernetes/comments/abc/abc,Kubernetes Networking: how to write your own CNI plug-in with bash,https://abc.com/a.gif,,`,
    `link,total_sources,sources,description,image_1,image_2,
    httplearnk8s,1,https://www.reddit.com/r/kubernetes/comments/abc/abc,Kubernetes Networking: how to write your own CNI plug-in with bash,https://abc.com/a.gif,,`,
    `link,total_sources,sources,description,image_1,image_2,
    httplearnk8s,1,https://www.reddit.com/r/kubernetes/comments/abc/abc,Kubernetes Networking: how to write your own CNI plug-in with bash Kubernetes Networking: how to write your own CNI plug-in with bash Kubernetes Networking: how to write your own CNI plug-in with bash Kubernetes Networking: how to write your own CNI plug-in with bash,https://abc.com/a.gif,,`,
    `link,total_sources,sources,description,image_1,image_2,
    https://learnk8s.io,1,https://www.reddit.com/r/kubernetes/comments/abc/abc,Kubernetes Networking: how to write your own CNI plug-in with bash,https.gif,,`,
    `link,total_sources,sources,description,image_1,image_2,
    https://learnk8s.io,1,https://www.reddit.com/r/kubernetes/comments/abc/abc,Kubernetes https://abc.com Networking: how to write your own CNI plug-in with bash,https://abc.com/a.gif,,`,
  ]

  cases.forEach((it) => {
    assert.throws(csv2Tweets.bind(null, it))
  })

  assert.end()
})
