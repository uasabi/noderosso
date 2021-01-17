import { Node } from 'node-red'
import { Client } from 'pg'
import { Actions, Events, Event } from './postgres.common'

export function Setup({
  node,
  connectionString,
  sqlStatement,
}: {
  node: Node
  connectionString: string
  sqlStatement: string
}) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'QUERY.V1': {
        const startTime = process.hrtime()
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
        await client.connect()
        const { rows } = await client.query(
          isStringNonEmpty(action.payload.query) ? action.payload.query : sqlStatement,
        )
        node.status({ fill: 'green', shape: 'dot', text: `Queried ${rows.length} rows ${time()}` })
        node.log(
          `Processed ${sqlStatement.substring(0, Math.min(20, sqlStatement.length))} in ${
            process.hrtime(startTime)[0]
          } seconds. Found ${rows.length} rows.`,
        )
        send(Event.result({ rows }, action.parts))
        await client.end()
        return done()
      }
      default:
        // assertUnreachable(action)
        break
    }
  }
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isStringNonEmpty(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

function assertUnreachable(x: never): void {}

function time() {
  return new Date().toISOString().substr(11, 5)
}
