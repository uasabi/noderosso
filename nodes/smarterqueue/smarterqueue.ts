import { Red, Node, NodeProperties } from 'node-red'
import { Setup } from './smarterqueue.lib'
import { isEvent, actions } from './smarterqueue.common'
import { WorkerNode } from '../worker-node'
import { asyncContext } from '../context'
import RRule, { RRuleSet, rrulestr } from 'rrule'
import { inspect } from 'util'

module.exports = function (RED: Red) {
  function SmarterQueue(this: Node, config: NodeProperties & { slots?: string; failsafe?: string; rrule?: string }) {
    RED.nodes.createNode(this, config)
    const node = this
    const context = asyncContext(node.context())

    let rrule: RRule | RRuleSet
    try {
      rrule = rrulestr(config.rrule?.trim() ?? '')
    } catch (error) {
      this.error(`Invalid RRule ${inspect(error)}`)
      return
    }

    const circuitBreakerMaxEmit =
      isString(config.failsafe) && isNumber(parseInt(config.failsafe, 10)) ? parseInt(config.failsafe, 10) : 2

    WorkerNode({
      fn: Setup({ node, context, rrule, circuitBreakerMaxEmit, newDate: () => new Date(), config }),
      isEvent,
      node,
      liftAction: (action: unknown) => {
        const validate = actions.safeParse(action)

        if (!validate.success) {
          const { fieldErrors, formErrors } = validate.error.flatten()
          const errorMessages = Object.keys(fieldErrors).map((it) => {
            return `${it}: ${fieldErrors[it]!.join(', ')}`
          })
          node.error([...errorMessages, formErrors].join('\n'))
          return undefined
        } else {
          return validate.data
        }
      },
    })
  }
  RED.nodes.registerType('smarterqueue', SmarterQueue)
}

function isString(value: unknown): value is string {
  return {}.toString.call(value) === '[object String]'
}

function isNumber(value: unknown): value is number {
  return {}.toString.call(value) === '[object Number]' && !isNaN(value as number)
}
