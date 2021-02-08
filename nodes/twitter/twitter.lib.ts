import { Node } from 'node-red'
import { Actions, Events, Event } from './twitter.common'
import Twitter from 'twitter-lite'
import {axios, prettyAxiosErrors, AxiosResponse} from '../axios';

export function Setup({ node }: { node: Node }) {
  const client = new Twitter((node as any).credentials)
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'PUBLISH.V1': {
        const {text, id, images} = action.payload
        let media_ids = images && Promise.all(images.map(async image => {
          try {
            return (await client.post('media/upload', {
              media_data: Buffer.from((await axios.get(image)).data, 'binary').toString('base64')
            })).media_id
          }catch(e){
            node.warn(String(prettyAxiosErrors(e)({
              noResponse: () => new Error('No response'),
              not200: (response: AxiosResponse) =>
                new Error(
                  `Invalid request. Received ${response.status} but I was expecting a 200. Response:\n${response.data}`,
                ),
              orElse: (e: string) => new Error(e),
            })))
            return null
          }
        }))
        
        send(Event.published({
          id,
          tweetId: (await client.post('statuses/update', {status: text, media_ids: (await media_ids)?.filter(v => v !== null)})).id_str
        }))
        node.log(`Processed message ${action.payload}`)
        node.status({
          fill: 'green',
          shape: 'dot',
          text: `Last processed ${action.payload} ${time()}`,
        })
        return done()
      }
      case 'RETWEET.V1': {
        const {tweetId, id} = action.payload
        send(Event.published({
          id,
          tweetId: (await client.post('statuses/retweet/:id', {id: tweetId})).id_str
        }))
        node.log(`Processed message ${action.payload}`)
        node.status({
          fill: 'green',
          shape: 'dot',
          text: `Last processed ${action.payload} ${time()}`,
        })
        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}
