import test from 'tape'
import { readFileSync } from 'fs'
import { join } from 'path'
import { RedditNestable, RedditResponse, extractReplies, Setup } from './reddit-scraper.lib'
import { Server, createServer } from 'http'

const fixtureReplies = JSON.parse(readFileSync(join(__dirname, 'fixture.json'), 'utf-8')) as RedditNestable<
  RedditResponse
>[]
const fixtureArticle = readFileSync(join(__dirname, 'fixture-article.json'), 'utf-8')
const fixtureSelf = readFileSync(join(__dirname, 'fixture-self.json'), 'utf-8')
const fixtureListing = readFileSync(join(__dirname, 'fixture-listing.json'), 'utf-8')

let server: Server
const port = 54321

test('setup', (assert) => {
  server = createServer((req, res) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')

    if (req.url?.includes('first')) {
      return res.end(`${fixtureListing}`)
    }

    if (req.url?.includes('second')) {
      return res.end(`${fixtureArticle}`)
    }

    if (req.url?.includes('third')) {
      return res.end(`${fixtureListing}`.replace('/r/second', '/r/fourth'))
    }

    if (req.url?.includes('fourth')) {
      return res.end(`${fixtureSelf}`)
    }

    res.end()
  })

  server.listen(port, () => {
    assert.comment(`Server running on port ${port}`)
    assert.end()
  })
})

test('extract replies', (assert) => {
  const replies = extractReplies(fixtureReplies)

  assert.deepEqual(replies, [
    {
      text:
        '<div class="md"><p>Very cool idea!</p>\n\n<p>You might look into adding tautulli to your stack as well for plex monitoring.</p>\n\n<p>Edit: It would also be nice to be able to override the default images in your helm chart.</p>\n</div>',
      replies: [
        {
          text:
            '<div class="md"><p>Thank you for your feedback!</p>\n\n<p>Yep, that was on the roadmap, but I think I will need to leave also volume mounts open to overrides, since different images could have different mountpoints. </p>\n\n<p>Maybe in the next release, among with considering the VPN configuration ;)</p>\n</div>',
          replies: [],
          score: 6,
          createdAt: '2021-01-01T18:39:16.000Z',
        },
      ],
      score: 13,
      createdAt: '2021-01-01T17:59:23.000Z',
    },
    {
      text:
        "<div class=\"md\"><p>If you're connecting sonarr and radarr to transmission, I'm going to assume you don't want transmission running without a VPN. Consider either switching out plain transmission in favor of transmission-openvpn for a convenient way to route transmission out through VPN while still exposing it to your other services, or alternatively, figure out a way to put all the *arrs and transmission behind a VPN.</p>\n</div>",
      replies: [
        {
          text:
            "<div class=\"md\"><p>well, actually, that's a good point, I am working on a way to put transmission behind a vpn, except I don't have a vpn actually, since I don't use transmission anymore, any clues on a decent free provider to test stuff with?</p>\n</div>",
          replies: [
            {
              text:
                '<div class="md"><p>You can always roll your own VPN server just to test the openvpn connection and make sure you have a good kill switch in case of disconnects. It won’t protect you but it will let you develop a release.</p>\n</div>',
              replies: [
                {
                  text:
                    '<div class="md"><p>Yeah, I can try with my vpn settings actually, but I always look for \'neutral\' setups to avoid biases in tests.</p>\n\n<p>I will just subscribe for some basic plan on an openvpn based vpn</p>\n</div>',
                  replies: [
                    {
                      text:
                        '<div class="md"><p>Check out <a href="https://hub.docker.com/r/binhex/arch-delugevpn">binhex/arch-delugevpn </a></p>\n</div>',
                      replies: [],
                      score: 1,
                      createdAt: '2021-01-01T19:48:25.000Z',
                    },
                  ],
                  score: 2,
                  createdAt: '2021-01-01T19:41:26.000Z',
                },
              ],
              score: 3,
              createdAt: '2021-01-01T19:38:10.000Z',
            },
            {
              text:
                "<div class=\"md\"><blockquote>\n<p>a decent free provider</p>\n</blockquote>\n\n<p>There is no such thing as free Internet. When you use a VPN, you are asking a third party to route your packets, which costs money, as well as take on any liability for any actions you take while connected to the VPN (liability = money), and you are asking them to act always in your benefit and be trustworthy. That doesn't come free. Many VPN providers offer service for less than $5/mo and that's a bargain considering what you're asking from them when you intend to torrent on them. I won't recommend any particular service. I'll let you do your own research. But I'll tell you that any \"free\" service is not something you want to connect to.</p>\n</div>",
              replies: [
                {
                  text:
                    '<div class="md"><p>Not completely true. A university in Japan has some free vpn options but I am not going to plug them here, as I cannot vouch on the security.</p>\n</div>',
                  replies: [
                    {
                      text:
                        '<div class="md"><p>ProtonVPN has some free servers as well</p>\n\n<p><a href="https://protonvpn.com/">https://protonvpn.com/</a></p>\n</div>',
                      replies: [],
                      score: 0,
                      createdAt: '2021-01-02T06:32:57.000Z',
                    },
                  ],
                  score: 1,
                  createdAt: '2021-01-02T02:18:04.000Z',
                },
                {
                  text:
                    '<div class="md"><p>Oh of course, I was not asking for free internet, I mean even a free plan with Uber reduced speed to try, external to my server to avoid biasing the tests</p>\n</div>',
                  replies: [
                    {
                      text:
                        '<div class="md"><p>Sure, there\'s a provider called ProtonVPN which has some free servers available</p>\n\n<p><a href="https://protonvpn.com">https://protonvpn.com</a></p>\n</div>',
                      replies: [],
                      score: 0,
                      createdAt: '2021-01-02T06:34:15.000Z',
                    },
                    {
                      text:
                        '<div class="md"><blockquote>\n<p>I was not asking for free internet, I mean even a free plan with Uber reduced speed</p>\n</blockquote>\n\n<p>So free Internet, but slower?</p>\n\n<p>We\'re talking about $5 here. Just pick any provider with port forwarding feature and go for it.</p>\n</div>',
                      replies: [
                        {
                          text: '<div class="md"><p>Yep I\'ll go with that!</p>\n</div>',
                          replies: [],
                          score: 2,
                          createdAt: '2021-01-01T20:00:13.000Z',
                        },
                      ],
                      score: -4,
                      createdAt: '2021-01-01T19:43:16.000Z',
                    },
                  ],
                  score: 1,
                  createdAt: '2021-01-01T19:40:15.000Z',
                },
              ],
              score: 6,
              createdAt: '2021-01-01T19:38:14.000Z',
            },
            {
              text:
                '<div class="md"><p>I\'m using this: <a href="https://hub.docker.com/r/haugene/transmission-openvpn">https://hub.docker.com/r/haugene/transmission-openvpn</a></p>\n\n<p>For me this has been working really great. I dont think there is any free providers, but if i remember correctly, you can use custom providers and host your own openvpn if you want to test.</p>\n</div>',
              replies: [],
              score: 1,
              createdAt: '2021-01-02T08:23:46.000Z',
            },
          ],
          score: 4,
          createdAt: '2021-01-01T19:15:55.000Z',
        },
        {
          text:
            "<div class=\"md\"><p>I have a server that is with a company/jurisdiction that doesn't care; however, I also have a public VPN provider that offers Wireguard and allows forwarding one port per Wireguard key.</p>\n\n<p>My setup is still just in Docker, but it's easy enough to configure it in a single K8s pod, although I've been considering writing a networking operator or maybe just a helm chart that make using another pod's network easier, either by making it a VPN server or by installing various proxies in the pod. (E.g. making a wireguard or openvpn server and/or a socks5 proxy into clusterip service that any pod can use. I'm envisioning a setup where you could build on it to make like \"every pod in X namespace is behind this VPN, or behind Tor\" or something like that. Or is that just dumb and there's some easy way to share pod networks that I'm not aware of?)</p>\n\n<p>Anyway, my torrenting client of choice is qbittorrent, because it's very easy to configure it via a config file to only use one network device / source IP address / etc, and/or to use a socks proxy. You can also of course just have it be in the same pod as a VPN connection, and use other security context stuff to isolate the containers in every way except networking. But it seems cleaner just to have the ability to make a shared network via operator or chart like I mentioned above.</p>\n</div>",
          replies: [],
          score: 2,
          createdAt: '2021-01-01T20:17:03.000Z',
        },
        {
          text:
            '<div class="md"><p>Nah. A lot of private trackers make this impossible.</p>\n\n<p>Most countries it really isn\'t an issue. I don\'t bother anymore.</p>\n</div>',
          replies: [],
          score: 1,
          createdAt: '2021-01-02T06:43:23.000Z',
        },
      ],
      score: 21,
      createdAt: '2021-01-01T19:09:30.000Z',
    },
    {
      text:
        '<div class="md"><p>Glad to see stuff like this being developed. K8s, for those who have put in the time to know how to use it, is a great means of managing self-hosting and homelabs.</p>\n</div>',
      replies: [],
      score: 9,
      createdAt: '2021-01-01T20:32:06.000Z',
    },
    {
      text:
        '<div class="md"><p>Excelent!</p>\n\n<p>Except, no bazarr for subtitles? That would be nice too.</p>\n</div>',
      replies: [
        {
          text: '<div class="md"><p>It\'s on the roadmap :) thank you!!</p>\n</div>',
          replies: [],
          score: 3,
          createdAt: '2021-01-01T21:12:46.000Z',
        },
      ],
      score: 7,
      createdAt: '2021-01-01T20:23:53.000Z',
    },
    {
      text:
        '<div class="md"><p>Just when I finished getting everything into kubernetes manually... Good job!</p>\n\n<p>It\'d be really neat if Plex could spin up pods for transcoding as needed.</p>\n</div>',
      replies: [
        {
          text:
            '<div class="md"><p>Appreciate a lot your inputs, I am thinking to get in touch with plex developers to try and discuss something about transcoding stuff :P</p>\n</div>',
          replies: [
            {
              text:
                '<div class="md"><p>Take a look at this. Never tried it but it’s on my to do list. <a href="https://github.com/munnerz/kube-plex">https://github.com/munnerz/kube-plex</a></p>\n</div>',
              replies: [
                {
                  text:
                    '<div class="md"><p>The project looks like it has been abandoned for quite sometime now :-/</p>\n</div>',
                  replies: [
                    {
                      text:
                        '<div class="md"><p>Take a look at <a href="https://k8s-at-home.com/charts">https://k8s-at-home.com/charts</a> for a repo.  There is a chart at <a href="https://github.com/k8s-at-home/charts/tree/master/charts/plex">https://github.com/k8s-at-home/charts/tree/master/charts/plex</a> that I\'m using that is the latest Plex version, and is forked off the munnerz chart.  Seems to work fine!</p>\n</div>',
                      replies: [
                        {
                          text: '<div class="md"><p>Does it start pods for transcoding too?</p>\n</div>',
                          replies: [
                            {
                              text: '<div class="md"><p>No</p>\n</div>',
                              replies: [
                                {
                                  text:
                                    "<div class=\"md\"><p>Then it's irrelevant isn't it? That's what the above user was wanting.</p>\n</div>",
                                  replies: [
                                    {
                                      text:
                                        '<div class="md"><p>Yes. At least its the best helm chart for plex.</p>\n\n<p>Btw it looks like kube-plex (with pod transcoding) isn\'t dead yet <a href="https://github.com/munnerz/kube-plex/pull/97#issuecomment-620610658">https://github.com/munnerz/kube-plex/pull/97#issuecomment-620610658</a></p>\n</div>',
                                      replies: [
                                        {
                                          text: '<div class="md"><p>That was April last year though :-\\</p>\n</div>',
                                          replies: [],
                                          score: 1,
                                          createdAt: '2021-01-02T21:25:12.000Z',
                                        },
                                      ],
                                      score: 1,
                                      createdAt: '2021-01-02T19:49:48.000Z',
                                    },
                                  ],
                                  score: 1,
                                  createdAt: '2021-01-02T19:20:48.000Z',
                                },
                              ],
                              score: 1,
                              createdAt: '2021-01-02T12:31:27.000Z',
                            },
                          ],
                          score: 1,
                          createdAt: '2021-01-02T06:44:32.000Z',
                        },
                      ],
                      score: 1,
                      createdAt: '2021-01-02T04:45:11.000Z',
                    },
                  ],
                  score: 2,
                  createdAt: '2021-01-01T22:47:23.000Z',
                },
              ],
              score: 3,
              createdAt: '2021-01-01T18:59:06.000Z',
            },
          ],
          score: 3,
          createdAt: '2021-01-01T18:48:54.000Z',
        },
      ],
      score: 4,
      createdAt: '2021-01-01T18:46:55.000Z',
    },
    {
      text:
        '<div class="md"><p>Duuuuude this is amazing. I\'ve been agonizing over how best to stack all of these together - you just made it easy mode.</p>\n\n<p>Thank you!</p>\n</div>',
      replies: [],
      score: 3,
      createdAt: '2021-01-01T21:51:42.000Z',
    },
    {
      text: '<div class="md"><p>Remindme!</p>\n</div>',
      replies: [
        {
          text:
            '<div class="md"><p>There is a 31 minute delay fetching comments.</p>\n\n<p><strong>Defaulted to one day.</strong></p>\n\n<p>I will be messaging you on <a href="http://www.wolframalpha.com/input/?i=2021-01-02%2018:53:09%20UTC%20To%20Local%20Time"><strong>2021-01-02 18:53:09 UTC</strong></a> to remind you of <a href="https://np.reddit.com/r/kubernetes/comments/koedh7/k8smediaserveroperator_your_allinone_resource_for/ghquq5u/?context=3"><strong>this link</strong></a></p>\n\n<p><a href="https://np.reddit.com/message/compose/?to=RemindMeBot&amp;subject=Reminder&amp;message=%5Bhttps%3A%2F%2Fwww.reddit.com%2Fr%2Fkubernetes%2Fcomments%2Fkoedh7%2Fk8smediaserveroperator_your_allinone_resource_for%2Fghquq5u%2F%5D%0A%0ARemindMe%21%202021-01-02%2018%3A53%3A09%20UTC"><strong>CLICK THIS LINK</strong></a> to send a PM to also be reminded and to reduce spam.</p>\n\n<p><sup>Parent commenter can </sup> <a href="https://np.reddit.com/message/compose/?to=RemindMeBot&amp;subject=Delete%20Comment&amp;message=Delete%21%20koedh7"><sup>delete this message to hide from others.</sup></a></p>\n\n<hr/>\n\n<table><thead>\n<tr>\n<th><a href="https://np.reddit.com/r/RemindMeBot/comments/e1bko7/remindmebot_info_v21/"><sup>Info</sup></a></th>\n<th><a href="https://np.reddit.com/message/compose/?to=RemindMeBot&amp;subject=Reminder&amp;message=%5BLink%20or%20message%20inside%20square%20brackets%5D%0A%0ARemindMe%21%20Time%20period%20here"><sup>Custom</sup></a></th>\n<th><a href="https://np.reddit.com/message/compose/?to=RemindMeBot&amp;subject=List%20Of%20Reminders&amp;message=MyReminders%21"><sup>Your Reminders</sup></a></th>\n<th><a href="https://np.reddit.com/message/compose/?to=Watchful1&amp;subject=RemindMeBot%20Feedback"><sup>Feedback</sup></a></th>\n</tr>\n</thead><tbody>\n</tbody></table>\n</div>',
          replies: [],
          score: 1,
          createdAt: '2021-01-01T19:29:13.000Z',
        },
      ],
      score: 2,
      createdAt: '2021-01-01T18:53:09.000Z',
    },
    {
      text: '<div class="md"><p>Remindme! 4 days</p>\n</div>',
      replies: [],
      score: 2,
      createdAt: '2021-01-01T19:32:47.000Z',
    },
    {
      text:
        '<div class="md"><p>Awesome! I have been looking at this with TrueNAS Scale Alpha. There are two other things I want to add. Nginx ingress with ssl termination and OpenVPN.</p>\n\n<p>I will look at your setup as the base</p>\n\n<p>Edit: typo</p>\n</div>',
      replies: [],
      score: 2,
      createdAt: '2021-01-01T19:33:31.000Z',
    },
    {
      text:
        '<div class="md"><p>Awesome job with this. I\'ve always just expressed everything with <a href="https://github.com/zimmertr/TKS-Deploy_Kubernetes_Apps">Kustomize</a>. But I might have to try this out.</p>\n</div>',
      replies: [],
      score: 2,
      createdAt: '2021-01-01T19:33:34.000Z',
    },
    {
      text: '<div class="md"><p>Nzbget would be a nice addition.</p>\n</div>',
      replies: [],
      score: 2,
      createdAt: '2021-01-01T22:37:22.000Z',
    },
    {
      text:
        '<div class="md"><p>Very nice. Im just in the process of converting my apps from standalone docker to pods.</p>\n\n<p>Question: when deletint the ns- does it leave the PV? I\'ve been testing that portion extensively as i dont want it to start deleting my media when i delete the pods ;)</p>\n</div>',
      replies: [
        {
          text:
            '<div class="md"><p>if you delete the namespace, the pvc are gone and so are the pvs, I think I will change the pvc policy probably, to retain the content of the PVs upon deletion!</p>\n</div>',
          replies: [],
          score: 1,
          createdAt: '2021-01-02T00:38:14.000Z',
        },
      ],
      score: 2,
      createdAt: '2021-01-01T22:51:41.000Z',
    },
    {
      text:
        "<div class=\"md\"><p>Kickass, I've been bouncing an idea like this around for a while but never got around to it. Guess I should just contribute here instead :)</p>\n\n<p>Did you have any thoughts about using operator-sdk/helm-operator? I'm one of the maintainers (though I mostly work with the Ansible-based operators), it's really fun to see the project used for something personally useful</p>\n</div>",
      replies: [
        {
          text:
            '<div class="md"><p>Smooth! Smooth is the correct word to describe working with helm-operator :) </p>\n\n<p>By the way, contributions are more than welcome, I made the chart public too ;)</p>\n</div>',
          replies: [],
          score: 1,
          createdAt: '2021-01-02T00:36:52.000Z',
        },
      ],
      score: 2,
      createdAt: '2021-01-02T00:33:19.000Z',
    },
    {
      text:
        '<div class="md"><p>Any interest in <del>emby</del> jellyfin as an optional alternative to plex?</p>\n</div>',
      replies: [
        {
          text: '<div class="md"><p>I\'m sure you meant jellyfin, and not emby.</p>\n</div>',
          replies: [
            {
              text: '<div class="md"><p>I did, thanks!</p>\n</div>',
              replies: [],
              score: 2,
              createdAt: '2021-01-01T20:05:11.000Z',
            },
          ],
          score: 6,
          createdAt: '2021-01-01T19:12:57.000Z',
        },
      ],
      score: 2,
      createdAt: '2021-01-01T19:06:08.000Z',
    },
    {
      text:
        "<div class=\"md\"><p>Why make a operator for this? Couldn't you just do a bunch of manifests. I've noticed operators for things that I wouldn't think would need one and I'm just asking generally.</p>\n</div>",
      replies: [
        {
          text:
            '<div class="md"><p>Agreed. Operators are really useful for abstracting away maintenance overhead like upgrades etc, but I\'d be surprised if this one was more than just an over-engineered deployment for managing helm charts (without actually having looked at its internals).</p>\n</div>',
          replies: [],
          score: 1,
          createdAt: '2021-01-02T11:31:19.000Z',
        },
        {
          text: '<div class="md"><p>Agreed.\nAn operator to deploy this is just slavery with extra steps.</p>\n</div>',
          replies: [],
          score: 0,
          createdAt: '2021-01-02T08:47:05.000Z',
        },
        {
          text:
            '<div class="md"><p>You are more than welcome to create the \'manifest\' version of the mediaserver.\nHaving an operator maintaining the correct configuration is just useful, plus it was an exercise with helm and operator sdk. \nAnswering generally, anyone can implement its solution in the way it prefers.</p>\n</div>',
          replies: [
            {
              text:
                "<div class=\"md\"><p>Just asking as I'm curious. A operator takes up resources and it's really only useful when doing initial setup. I'd think getting all these bits interconnected is difficult and maybe a operator will assist. But from what I understand you can't remove a operator after that setup is done, so wouldn't it be better to use something like helm instead of a operator in this case. If you wanted to setup a media service regularly like a saas offering I'd see it's use. Or was this simply a exercise in understanding the sdk that you wished to share, which is cool too. Again mean no offence and projects like this allow people to learn from each other so I think they are great.</p>\n</div>",
              replies: [
                {
                  text:
                    '<div class="md"><p>You can remove it actually, just remove the operator deployment, the cr and crd and you are done.</p>\n</div>',
                  replies: [
                    {
                      text:
                        '<div class="md"><p>Doesn\'t removing the operator break the deployed mediaservices tho as the statefulsets etc get taints etc referencing the operator?</p>\n</div>',
                      replies: [
                        {
                          text:
                            '<div class="md"><p>Why would you remove the operator without removing the crd?</p>\n</div>',
                          replies: [],
                          score: 0,
                          createdAt: '2021-01-02T15:24:57.000Z',
                        },
                      ],
                      score: 2,
                      createdAt: '2021-01-02T13:22:01.000Z',
                    },
                  ],
                  score: 0,
                  createdAt: '2021-01-02T13:19:45.000Z',
                },
              ],
              score: 3,
              createdAt: '2021-01-02T13:18:12.000Z',
            },
          ],
          score: -1,
          createdAt: '2021-01-02T09:53:08.000Z',
        },
      ],
      score: 3,
      createdAt: '2021-01-02T04:38:44.000Z',
    },
    {
      text:
        '<div class="md"><p>There’s an image of bananaspliff/transmission-openvpn that works well for putting the stack behind a vpn. I have it running with jacket, sonarr, radarr, and ombi. Feeds into a standalone plex install.</p>\n</div>',
      replies: [],
      score: 1,
      createdAt: '2021-01-02T01:41:45.000Z',
    },
    {
      text:
        '<div class="md"><p>What does this operate? Does is clean old videos? Does it autoscale in some way?  Does it keep all the components updated? I get the impression this adds an abstraction layer over kubernetes. Why use this over kustomize for each component? At least then you have the choice of using NZbget or sabnzbd or transmission and other customizations. At best this is a leaky abstraction at some point.</p>\n</div>',
      replies: [],
      score: 1,
      createdAt: '2021-01-02T11:56:58.000Z',
    },
    {
      text: '<div class="md"><p>Ipvanish, buy one account, unlimited concurrent connections.</p>\n</div>',
      replies: [],
      score: 1,
      createdAt: '2021-01-01T22:38:30.000Z',
    },
  ])
  assert.end()
})

test('Single article', async (assert) => {
  const input = Setup({
    node: { status: () => {}, error: () => {}, log: () => {} } as any,
    baseUrl: `http://localhost:${port}`,
  })
  await input(
    { topic: 'FETCH.V1', payload: { subreddit: 'first' }, _msgid: '1' },
    (event) =>
      assert.deepEqual(event, {
        topic: 'POST_LINK.V1',
        payload: {
          link: 'https://www.openfaas.com/blog/kubernetes-webhooks-made-easy-with-openfaas/',
          score: 1,
          replies: [
            {
              text:
                '<div class="md"><p>> In this post you’ll learn how to write Kubernetes Admission webhooks using OpenFaaS functions.</p>\n\n<p>This is a guest post from a community member, and makes the setup easier than usual to start reacting to events and webhooks from K8s.</p>\n</div>',
              replies: [],
              score: 2,
              createdAt: '2021-01-23T12:17:01.000Z',
            },
          ],
          permalink: 'http://localhost:54321/r/second',
          createdAt: '2021-01-23T12:16:10.000Z',
        },
      }),
    () => assert.pass(),
  )
  assert.end()
})

test('Self text', async (assert) => {
  const input = Setup({
    node: { status: () => {}, error: () => {}, log: () => {} } as any,
    baseUrl: `http://localhost:${port}`,
  })
  await input(
    { topic: 'FETCH.V1', payload: { subreddit: 'third' }, _msgid: '1' },
    (event) =>
      assert.deepEqual(event, {
        topic: 'POST_SELF.V1',
        payload: {
          text:
            '<!-- SC_OFF --><div class="md"><p>New release of my Kubeswitch tool. Now supports for multiple Kubernetes config files.</p>\n\n<p><a href="https://github.com/trankchung/kubeswitch/releases/tag/v0.2.0">https://github.com/trankchung/kubeswitch/releases/tag/v0.2.0</a></p>\n</div><!-- SC_ON -->',
          score: 10,
          replies: [
            {
              text:
                '<div class="md"><p>What is the big difference to kubie?\nHaven\'t tried kubeswitch yet and only use kubie occasionally.</p>\n</div>',
              replies: [
                {
                  text:
                    '<div class="md"><p>I used to use kubie but kubie only supports one session so no matter which terminal you’re in you’re always interacting with same k8s cluster. I use tmux and I have many windows and with kubeswitch I can have each window interacting with different k8s cluster.</p>\n</div>',
                  replies: [
                    {
                      text:
                        '<div class="md"><p>This is what I use kubie for, having independent connections to different clusters and namespaces in my different terminator windows (I use terminator instead of tmux, since I\'m too dumb to use tmux properly ;) )</p>\n</div>',
                      replies: [
                        {
                          text:
                            '<div class="md"><p>I just look at kubie again and looks like it supports multiple sessions now. It didn’t in the past. Use kubie if you’d like ;)</p>\n</div>',
                          replies: [],
                          score: 2,
                          createdAt: '2021-01-24T15:08:43.000Z',
                        },
                      ],
                      score: 1,
                      createdAt: '2021-01-24T11:22:46.000Z',
                    },
                  ],
                  score: 1,
                  createdAt: '2021-01-23T23:38:55.000Z',
                },
              ],
              score: 2,
              createdAt: '2021-01-23T23:36:05.000Z',
            },
          ],
          permalink: 'http://localhost:54321/r/fourth',
          createdAt: '2021-01-23T20:13:08.000Z',
        },
      }),
    () => assert.pass(),
  )
  assert.end()
})

test('tear down', (assert) => {
  server.close(() => {
    assert.end()
  })
})
