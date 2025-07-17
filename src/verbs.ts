import { setNounValue, type Noun } from './nouns'

// toggle verb pairs
export const verbPairs = {
  open: 'close',
  show: 'hide',
  turnOn: 'turnOff',
  check: 'uncheck',
  enable: 'disable',
  expand: 'collapse',
  activate: 'deactivate',
  start: 'end',
  connect: 'disconnect',
  focus: 'blur',
  mount: 'unmount',
  reveal: 'conceal',
  display: 'dismiss',
  lock: 'unlock',
  subscribe: 'unsubscribe'
} as const

export type PositiveVerbName = keyof typeof verbPairs
export type NegativeVerbName = typeof verbPairs[PositiveVerbName]
export type VerbName = PositiveVerbName | NegativeVerbName | 'toggle'
export type Verb = (noun: Noun) => void

export type Verbs = Record<VerbName, Verb>
export type PositiveVerbs = Record<PositiveVerbName, Verb>
export type NegativeVerbs = Record<NegativeVerbName, Verb>

const createVerbs = (keys: readonly string[], value: boolean) =>
  Object.fromEntries(keys.map(key => [key, (noun: Noun) => setNounValue(noun, value)]))

export const positiveVerbs = createVerbs(Object.keys(verbPairs), true) as PositiveVerbs
export const negativeVerbs = createVerbs(Object.values(verbPairs), false) as NegativeVerbs

const toggle: Verb = (noun: Noun) => setNounValue(noun, !noun?.isActive)

export const verbs: Verbs = { ...positiveVerbs, ...negativeVerbs, toggle }
