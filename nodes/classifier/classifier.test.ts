import test from 'tape'
import { tokenize } from './classifier.model'

test('it should tokenize', (assert) => {
  const cases = [
    {
      text: `<p><a href="https://medium.com/@michaelfornaro/automated-ha-kubernetes-deployment-on-raspberry-pis-408f38cd836c?source=friends_link&sk=3ae49e34b37f971ee38705c2d7b661f6" target="_blank">Automated HA Kubernetes deployment on Raspberry Pis</a><p>`,
      expected: ['autom', 'ha', 'kubernet', 'deploy', 'raspberri', 'pis', 'medium.com'],
    },
    {
      text: `<p><code>test</code>one<p>`,
      expected: ['one'],
    },
    {
      text: `<p><img src="https://image.com/image.png" alt="kubernetes" /><p>`,
      expected: ['kubernet'],
    },
    {
      text: `<p><a href="https://link.com/" title="kubernetes" /><p>`,
      expected: ['link.com', 'kubernet'],
    },
    {
      text: `<p><a href="https://www.reddit.com/r/kubernetes/comments/hthl9w/remote_management_of_clusters_with_bastion_server/" target="_blank" class="navy underline">Remote management of clusters with bastion server in between</a></p><p>
      </p><div><p>The company I work for has hundreds of clusters spread out which I need to manage. Currently what I do is ssh into the bastion server and then ssh into the specific node I need to work on. </p>
      <p>There must be a better way to work than this but I couldn't find any answers and my colleagues are doing the same thing. </p>
      <p>The optimal way would be for me to run kubectl on my local machine and be able to run commands remotely from my machine to another cluster and use VSCode k8s plugin to perform any operation on the remote cluster.</p>
      <p>Do you guys know of any way to do this? How are you managing clusters that have a bastion server in between?</p>
      </div>`,
      expected: [
        'remot',
        'manag',
        'cluster',
        'bastion',
        'server',
        'the',
        'compani',
        'i',
        'work',
        'hundr',
        'cluster',
        'spread',
        'i',
        'need',
        'manag',
        'current',
        'i',
        'ssh',
        'bastion',
        'server',
        'ssh',
        'specif',
        'node',
        'i',
        'need',
        'work',
        'there',
        'must',
        'better',
        'way',
        'work',
        'i',
        'not',
        'find',
        'answer',
        'colleagu',
        'thing',
        'the',
        'optim',
        'way',
        'run',
        'kubectl',
        'local',
        'machin',
        'abl',
        'run',
        'command',
        'remot',
        'machin',
        'anoth',
        'cluster',
        'use',
        'vscode',
        'k8s',
        'plugin',
        'perform',
        'oper',
        'remot',
        'cluster',
        'do',
        'guy',
        'know',
        'way',
        'how',
        'manag',
        'cluster',
        'bastion',
        'server',
        'www.reddit.com',
      ],
    },
  ]

  cases.forEach((it, index) => {
    assert.test(`#tokenize-${index}`, (assert) => {
      assert.deepEqual(tokenize({ language: 'en', text: it.text }), it.expected)
      assert.end()
    })
  })
  assert.end()
})
