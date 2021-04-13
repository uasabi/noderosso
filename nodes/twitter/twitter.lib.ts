import { Node } from 'node-red'
import { Actions, Events, Event } from './twitter.common'
import Twitter from 'twitter-lite'
import { axios, prettyAxiosErrors, AxiosResponse } from '../axios'
import { inspect } from 'util'

export function Setup({ node, clientApi, clientUpload }: { node: Node; clientApi: Twitter; clientUpload: Twitter }) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'PUBLISH.V1': {
        const { text, id, images } = action.payload
        const mediaIds = [] as string[]

        for (const image of images ?? []) {
          const imageData = await fetchImage(image)

          if (imageData instanceof Error) {
            node.warn(
              [`Error while fetching the image ${image}`, `[${imageData.name}]: ${imageData.message}`].join('\n'),
            )
            continue
          }

          try {
            const mediaId = (
              await clientUpload.post('media/upload', {
                media_data: Buffer.from(imageData, 'binary').toString('base64'),
              })
            ).media_id
            mediaIds.push(mediaId)
          } catch (error) {
            node.warn(`Error while uploading the image ${image}\n${inspect(error)}`)
          }
        }

        try {
          const response = await clientApi.post('statuses/update', {
            status: text,
            media_ids: mediaIds,
          })
          send(
            Event.published({
              id,
              tweetId: response.id_str,
            }),
          )
          node.log(`Processed tweet ${action.payload.id}`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Last processed ${action.payload.id} ${time()}`,
          })
        } catch (error) {
          const message = `Error while posting the tweet ${action.payload.id}\n${inspect(error)}`
          send(
            Event.failed({
              id,
              message,
            }),
          )
          node.error(message)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
        }

        return done()
      }
      case 'RETWEET.V1': {
        const { tweetId, id } = action.payload

        try {
          const response = await clientApi.post('statuses/retweet/:id', { id: tweetId })
          send(
            Event.published({
              id,
              tweetId: response.id_str,
            }),
          )
          node.log(`Retweeted tweet ${action.payload.id}`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Last processed ${action.payload.id} ${time()}`,
          })
        } catch (error) {
          const message = `Error while retweeting the tweet ${action.payload.id}\n${inspect(error)}`
          send(
            Event.failed({
              id,
              message,
            }),
          )
          node.error(message)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
        }

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

class ImageDownloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageDownloadError'
  }
}

async function fetchImage(image: string): Promise<string | ImageDownloadError> {
  let response: AxiosResponse
  try {
    response = await axios.get<string>(image)
  } catch (e) {
    return prettyAxiosErrors(e)({
      noResponse: () => new ImageDownloadError(`Timed out while fetching the image`),
      not200: (response: AxiosResponse) =>
        new ImageDownloadError(
          `Invalid response. Received ${response.status} but I was expecting a 200. Response:\n${response.data}`,
        ),
      orElse: (e: string) => new ImageDownloadError(`Unknown error`),
    })
  }

  return response.data
}
