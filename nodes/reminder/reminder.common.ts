import * as z from 'zod'

const Schema = {
  tick: z.object({
    _msgid: z.string(),
    topic: z.literal('TICK.V1'),
  }),
}

export const actions = Schema.tick
export type Actions = z.infer<typeof actions>
export const isAction = actions.check.bind(actions)
export function upgradeAction(action: any, log: (message: string) => void): z.infer<typeof actions> {
  return action
}

export const events = z.void()
export type Events = ReturnType<typeof Event[keyof typeof Event]>
export const isEvent = events.check.bind(events)

export const Event = {}
