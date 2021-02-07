import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './smarterqueue.lib'
import { isAction, upgradeAction, isEvent } from './smarterqueue.common'
import { WorkerNode } from '../worker-node'
import { asyncContext } from '../context'
import { parseDate } from 'chrono-node'
import humanInterval from 'human-interval'

module.exports = function (RED: Red) {
  function MyFirstNode(this: Node, config: NodeProperties & { slots?: string; failsafe?: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())
    const slots = (isString(config.slots) ? config.slots.split('|') : [])
      .map((it) => parseDate(it)!)
      .filter((it) => !!it)
      .map((it) => {
        return {
          days: it.getDay(),
          hours: it.getHours(),
          minutes: it.getMinutes(),
        }
      })
      .map((it) => {
        return (
          humanInterval(`${it.days} days`)! +
          humanInterval(`${it.hours} hours`)! +
          humanInterval(`${it.minutes} minutes`)!
        )
      })
      .sort()

    const circuitBreakerMaxEmit =
      isString(config.failsafe) && isNumber(parseInt(config.failsafe, 10)) ? parseInt(config.failsafe, 10) : 2

    if (slots.length === 0) {
      this.error('Empty slots')
      return
    }

    WorkerNode({
      fn: Setup({ node, context, slots, circuitBreakerMaxEmit }),
      isAction,
      isEvent,
      node,
      liftAction: (action: any) => upgradeAction(action, node.warn),
    })
  }
  RED.nodes.registerType('smarterqueue', MyFirstNode)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}
