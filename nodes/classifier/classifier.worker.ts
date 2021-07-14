import { Worker, isMainThread, parentPort, WorkerOptions } from 'worker_threads'
import { resolve } from 'path'
import { MessagePort } from 'worker_threads'
import { Channel, Loop } from '@noderosso/packages/channel'
import { Commands, Reply, isCommand } from './classifier.common'
import { inspect } from 'util'
import { trainModel, GenericClassifier } from './classifier.model'

if (!isMainThread && !!parentPort) {
  initWebWorker(parentPort)
}

export function trainingWorker(): Worker {
  const worker = workerTs(__filename, {
    workerData: {},
  })
  return worker
}

function workerTs(file: string, options: WorkerOptions) {
  if (!options.workerData) {
    options.workerData = {}
  }
  options.workerData.__filename = file
  return new Worker(resolve(__dirname, 'classifier.worker.js'), options)
}

type QueueItem = { id: string; text: string; keywords: string[]; language: string }

async function initWebWorker(port: MessagePort) {
  const channel = new Channel()
  let classifier: GenericClassifier
  port.on('message', async (command: unknown) => {
    if (!isCommand(command)) {
      port.postMessage(Reply.error({ message: `Invalid command ${JSON.stringify(command)}` }))
      return
    }
    await onCommand(command)
  })

  async function onCommand(command: Commands) {
    switch (command.type) {
      case 'CLASSIFY': {
        channel.put<QueueItem>({
          text: command.text,
          language: command.language,
          keywords: command.keywords,
          id: command.id,
        })
        break
      }
      case 'SHUTDOWN':
        port.postMessage(Reply.log({ message: `Worker ${command.workerId} is shutting down...` }))
        process.exit(0)
      case 'TRAINING':
        const trainingTime = process.hrtime()
        const dataset = command.documents.map((it) => {
          return { text: it.text, keywords: it.keywords, category: it.category, language: it.language }
        })
        classifier = await trainModel(dataset)
        port.postMessage(
          Reply.log({
            message: `Model trained in ${process.hrtime(trainingTime)[0]} seconds (${dataset.length} documents)`,
          }),
        )
        port.postMessage(
          Reply.status({ fill: 'green', shape: 'dot', text: `Model trained (${dataset.length} documents) ${time()}` }),
        )
        start()
        break
      default:
        assertUnreachable(command)
        break
    }
  }

  function start() {
    Loop<QueueItem>(
      channel,
      (items) => {
        items.forEach((it) => {
          const result = classifier.classify(it)
          port.postMessage(
            Reply.result({
              category: result,
              id: it.id,
            }),
          )
        })
      },
      (error) => {
        port.postMessage(Reply.error({ message: `Error ${inspect(error)}` }))
      },
    )
  }
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}
