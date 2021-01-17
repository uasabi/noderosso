import { Node } from 'node-red'
import { trainingWorker } from './classifier.worker'
import { Worker } from 'worker_threads'
import { AsyncContext } from '../context'
import { Channel, Loop } from '../channel'
import {
  DocumentRecord,
  documentRecord,
  NonClassifiedDocument,
  Command,
  Replies,
  isReply,
  Events,
  Event,
  ClassifiedDocument,
  Actions,
} from './classifier.common'
import { inspect } from 'util'

export function Setup({
  node,
  context,
  isDryRun,
  categories,
  documentExpiry,
  autoaccept,
  unverifiedDocumentExpiry,
}: {
  node: Node
  context: AsyncContext
  categories: string[]
  isDryRun: boolean
  documentExpiry: number
  unverifiedDocumentExpiry: number
  autoaccept: boolean
}) {
  let currentWorker: Worker | undefined
  let unsubscribe: Function | undefined
  const channel = new Channel()

  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'FLUSH.V1': {
        node.log('Flush')
        const keys: string[] = await context.keys()
        for (const key of keys) {
          await context.set(key)
        }
        return done()
      }
      case 'SHUTDOWN.V1': {
        shutdownCurrentWorker()
        return done()
      }
      case 'TRAIN.V1': {
        if (isDryRun) {
          node.log('Dry run. Skipping training...')
          return done()
        }
        if (!!currentWorker) {
          shutdownCurrentWorker()
        }
        currentWorker = initWorker()
        unsubscribe = Loop<{
          id: string
          text: string
          keywords: string[]
          language: string
        }>(
          channel,
          (items) => {
            items.forEach((item) => {
              currentWorker?.postMessage(Command.classify(item))
            })
          },
          (error) => node.error(inspect(error)),
        )
        const trainingTime = process.hrtime()
        node.log('Loading dataset')
        const keys = await context.keys()
        const dataset = await keys.reduce(async (accPromise, it) => {
          const acc = await accPromise
          const document = { ...(await context.get<DocumentRecord>(it)), id: it } // backwards compatibility
          if (!documentRecord.check(document)) {
            return acc
          }
          if (!document.verified) {
            return acc
          }
          acc.push({
            id: document.id,
            text: document.text,
            keywords: document.keywords,
            language: document.language,
            category: document.category,
          })
          return acc
        }, Promise.resolve([]) as Promise<ClassifiedDocument[]>)
        currentWorker.postMessage(Command.train({ documents: dataset }))
        node.status({ fill: 'green', shape: 'dot', text: `Dataset loaded (${dataset.length} documents) ${time()}` })
        node.log(`Dataset loaded in ${process.hrtime(trainingTime)[0]} seconds (${dataset.length} documents)`)
        return done()
      }
      case 'ADD_CLASSIFICATION.V1': {
        if (categories.includes(action.payload.category)) {
          const doc = await context.get<DocumentRecord>(action.payload.documentId)
          if (documentRecord.check(doc)) {
            node.status({
              fill: 'green',
              shape: 'dot',
              text: `Adding verified doc ${action._msgid} ${time()}`,
            })
            await context.set<DocumentRecord>(action.payload.documentId, {
              ...doc,
              verified: true,
              category: action.payload.category,
            })
          }
        }
        return done()
      }
      case 'GARBAGE_COLLECTION.V1': {
        let documentsRemovedBecauseTooOld = 0
        let documentsRemovedBecauseUnverifiedTooLong = 0
        const keys: string[] = await context.keys()
        for (const key of keys) {
          const document = { ...(await context.get<DocumentRecord>(key)), id: key } // backwards compatibility
          if (!documentRecord.check(document)) {
            node.error(`Invalid key ${key} detect. Deleting...`)
            await context.set(key)
            continue
          }
          if (Date.now() - new Date(document.createdAt).valueOf() > documentExpiry) {
            documentsRemovedBecauseTooOld += 1
            await context.set(key)
          } else {
            await context.set(key, { ...document, autoaccept: !!document.autoaccept }) // backfilling
          }
          if (!document.verified && Date.now() - new Date(document.createdAt).valueOf() > unverifiedDocumentExpiry) {
            documentsRemovedBecauseUnverifiedTooLong += 1
            await context.set(key)
          }
        }
        node.log(
          `Purging ${
            documentsRemovedBecauseTooOld + documentsRemovedBecauseUnverifiedTooLong
          } elements from classifier (${documentsRemovedBecauseTooOld} old, ${documentsRemovedBecauseUnverifiedTooLong} unverified)`,
        )
        return done()
      }
      case 'CLASSIFY.V1': {
        const id = generateId()
        const { text, keywords, language, ...rest } = action.payload
        await context.set<DocumentRecord>(id, {
          id,
          text,
          keywords: Array.isArray(keywords) ? keywords : [],
          createdAt: new Date().toISOString(),
          category: '',
          verified: false,
          message: isDryRun ? undefined : rest,
          language: isStringNonEmpty(language) ? language : 'en',
          autoaccept,
        })
        node.log(`Classify document ${id} ${currentWorker?.threadId ?? '(unknown)'}`)
        if (isDryRun) {
          node.status({ fill: 'yellow', shape: 'dot', text: `Dry run. Skipping classification ${time()}` })
          node.log(`Dry run. Skipping classification.`)
          send(
            Event.message({
              text,
              keywords: Array.isArray(keywords) ? keywords : [],
              language: isStringNonEmpty(language) ? language : 'en',
              ...rest,
              documentId: id,
            }),
          )
        } else {
          node.status({ fill: 'yellow', shape: 'dot', text: `Classifying ${action._msgid} ${time()}` })
          channel.put<NonClassifiedDocument>({
            id,
            text,
            keywords: Array.isArray(keywords) ? keywords : [],
            language: isStringNonEmpty(language) ? language : 'en',
          })
        }
        return done()
      }
      default:
        assertUnreachable(action)
        break
    }
  }

  function shutdownCurrentWorker() {
    node.log(`Shutting down ${currentWorker?.threadId ?? '(nothing)'}`)
    unsubscribe?.()
    currentWorker?.postMessage(Command.shutdown({ workerId: currentWorker.threadId }))
  }

  function initWorker(): Worker {
    const worker = trainingWorker()
    worker.on('message', async (reply: Replies) => {
      if (!isReply(reply)) {
        node.error(`Invalid reply ${inspect(reply)}`)
        return
      }
      switch (reply.type) {
        case 'STATUS':
          node.status(reply)
          break
        case 'ERROR':
          node.error(reply.message)
          break
        case 'LOG':
          node.log(reply.message)
          break
        case 'RESULT':
          node.status({ fill: 'green', shape: 'dot', text: `Classified ${reply.id} ${time()}` })
          node.log(`Classified ${reply.id}. Worker ${currentWorker?.threadId ?? '(unknown)'}`)
          const document = await context.get<DocumentRecord>(reply.id)
          if (document) {
            await context.set<DocumentRecord>(reply.id, {
              ...document,
              category: reply.category,
              message: undefined,
              verified: !!document.autoaccept,
            })
            node.send<Events>(
              Event.message({
                ...document.message,
                text: document.text,
                keywords: document.keywords,
                language: document.language,
                documentId: reply.id,
                category: reply.category,
              }),
            )
          }
          break
        default:
          assertUnreachable(reply)
          break
      }
    })
    worker.on('error', (err) => node.error(inspect(err)))
    worker.on('exit', (code: number) => {
      if (code !== 0) node.error(`Worker stopped with exit code ${code}`)
    })
    return worker
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isStringNonEmpty(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

function assertUnreachable(x: never): void {}

function uuid() {
  return Math.random().toString(36).substring(7)
}

function generateId() {
  return `${Date.now()}-${uuid()}`
}

function time() {
  return new Date().toISOString().substr(11, 5)
}
