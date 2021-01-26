import test from 'tape'
import { Setup } from './mercury.lib'
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

test.skip('parse the original link', async (assert) => {
  const node = new MockNode() as any
  const input = Setup({ node })

  ;[
    {
      content:
        '<description><![CDATA[<a href="https://news.ycombinator.com/item?id=23962638">Comments</a>]]></description>',
      sourceLink: 'https://news.ycombinator.com/item?id=23962638',
    },
    {
      content:
        '<content type="html">&lt;table&gt; &lt;tr&gt;&lt;td&gt; &lt;a href=&quot;https://www.reddit.com/r/kubernetes/comments/hzjx64/how_to_track_costs_in_multitenant_amazon_eks/&quot;&gt; &lt;img src=&quot;https://b.thumbs.redditmedia.com/LW96OgS-QEKmbTZm-7D1yWzknSBdfcihLfE4Hw9S1hQ.jpg&quot; alt=&quot;How to track costs in multi-tenant Amazon EKS clusters using Kubecost&quot; title=&quot;How to track costs in multi-tenant Amazon EKS clusters using Kubecost&quot; /&gt; &lt;/a&gt; &lt;/td&gt;&lt;td&gt; &amp;#32; submitted by &amp;#32; &lt;a href=&quot;https://www.reddit.com/user/AjayTripathy&quot;&gt; /u/AjayTripathy &lt;/a&gt; &lt;br/&gt; &lt;span&gt;&lt;a href=&quot;https://aws.amazon.com/blogs/containers/how-to-track-costs-in-multi-tenant-amazon-eks-clusters-using-kubecost/&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt; &amp;#32; &lt;span&gt;&lt;a href=&quot;https://www.reddit.com/r/kubernetes/comments/hzjx64/how_to_track_costs_in_multitenant_amazon_eks/&quot;&gt;[comments]&lt;/a&gt;&lt;/span&gt; &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;</content>',
      sourceLink: 'https://www.reddit.com/r/kubernetes/comments/hzjx64/how_to_track_costs_in_multitenant_amazon_eks/',
    },
    {
      content:
        '<table> <tr><td> <a href="https://www.reddit.com/r/kubernetes/comments/hzjx64/how_to_track_costs_in_multitenant_amazon_eks/"> <img src="https://b.thumbs.redditmedia.com/LW96OgS-QEKmbTZm-7D1yWzknSBdfcihLfE4Hw9S1hQ.jpg" alt="How to track costs in multi-tenant Amazon EKS clusters using Kubecost" title="How to track costs in multi-tenant Amazon EKS clusters using Kubecost" /> </a> </td><td> &#32; submitted by &#32; <a href="https://www.reddit.com/user/AjayTripathy"> /u/AjayTripathy </a> <br/> <span><a href="https://aws.amazon.com/blogs/containers/how-to-track-costs-in-multi-tenant-amazon-eks-clusters-using-kubecost/">[link]</a></span> &#32; <span><a href="https://www.reddit.com/r/kubernetes/comments/hzjx64/how_to_track_costs_in_multitenant_amazon_eks/">[comments]</a></span> </td></tr></table>',
      sourceLink: 'https://www.reddit.com/r/kubernetes/comments/hzjx64/how_to_track_costs_in_multitenant_amazon_eks/',
    },
    {
      content: `<description>

            &#60;p&#62;&#60;a href=&#34;https://lobste.rs/s/ha8c42/you_don_t_need_reproducible_builds&#34;&#62;Comments&#60;/a&#62;&#60;/p&#62;
        </description>`,
      sourceLink: 'https://lobste.rs/s/ha8c42/you_don_t_need_reproducible_builds',
    },
  ].forEach((scenario) => {
    assert.test(`# ${scenario.sourceLink}`, async (t) => {
      t.plan(2)

      await input(
        {
          topic: 'FETCH.V1',
          _msgid: '1',
          payload: {
            url: `http://localhost:${port}`,
            content: scenario.content,
          },
        },
        (message) => {
          t.equal(message.payload.sourceLink, scenario.sourceLink)
        },
        () => t.pass(),
      )

      t.end()
    })
  })

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
