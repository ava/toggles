import { useRef, useMemo, useReducer, useLayoutEffect } from 'react'
import { globalNouns } from './src/globalNouns'
import { createNounFromState, setNounValue, type Noun } from './src/utils'

type PositiveVerb = keyof typeof toggleVerbs
type NegativeVerb = typeof toggleVerbs[PositiveVerb]
type AllVerbKeys = PositiveVerb | NegativeVerb | 'toggle'

// toggle verb pairs
export const toggleVerbs = {
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

export const positiveVerbs = Object.keys(toggleVerbs) as PositiveVerb[]
export const negativeVerbs = Object.values(toggleVerbs) as NegativeVerb[]

export { nounState, type Noun } from './src/utils'

type Toggles = [nouns: Record<string, Noun>, verbs: Verbs]

export const useToggles = (...args: (string | boolean)[]): Toggles => [useNouns(...args), verbs]

export type Verbs = {
  [K in AllVerbKeys]: (noun: Noun) => void
}

export const verbs = Object.entries(toggleVerbs).reduce<Record<string, (noun: Noun) => void>>((acc, [pos, neg]) => {
  acc[pos] = (noun: Noun) => setNounValue(noun, true)
  acc[neg] = (noun: Noun) => setNounValue(noun, false)
  return acc
}, { toggle: (noun: Noun) => setNounValue(noun, !noun?.isActive) }) as Verbs

export const useVerbs = (): Verbs => verbs

export function useNouns(...args: (string | boolean)[]): Record<string, Noun> {
  const namespace = typeof args[0] === 'string' && args[0] ? args[0] : undefined
  const initialValues = (namespace ? args.slice(1) : args) as boolean[]

  const rerender = useReducer(() => ({}), 0)[1]
  const nounOrder = useRef<string[]>([])
  const unsubscribers = useRef<Map<string, () => void>>(new Map())

  useLayoutEffect(() => () => {
    unsubscribers.current.forEach((unsub, key) => {
      unsub()
      if (namespace) globalNouns.release(key)
    })
    unsubscribers.current.clear()
  }, [namespace])

  const localNouns = useRef<Record<string, { state: boolean; noun: Noun }>>({})

  const nouns = useMemo(() => new Proxy({} as Record<string, Noun>, {
    get(_, prop: string) {
      if (typeof prop !== 'string') return undefined

      // Check for verb name conflicts
      if (prop in toggleVerbs || prop === 'toggle') {
        const message = `Invalid noun name "${prop}": noun names must not conflict with verb names`
        if (process.env.NODE_ENV !== 'production') throw new Error(message)
        console.warn(message)
      }

      // Track order of noun access for initial values
      if (!nounOrder.current.includes(prop)) nounOrder.current.push(prop)
      const nounIndex = nounOrder.current.indexOf(prop)

      const initialValue = initialValues[nounIndex] ?? false

      // Global noun - use global registry with namespace prefix
      if (namespace) {
        const key = `${namespace}:${prop}`
        const noun = globalNouns.get(key, initialValue)
        if (!unsubscribers.current.has(key)) {
          globalNouns.acquire(key)
          unsubscribers.current.set(key, globalNouns.subscribe(key, rerender))
        }
        return noun
      }

      // Local noun - use local state
      localNouns.current[prop] ??= (() => {
        const entry = { state: initialValue, noun: null as any }
        entry.noun = createNounFromState(
          prop,
          () => entry.state,
          (val) => { entry.state = val; rerender(); }
        )
        return entry
      })()
      return localNouns.current[prop].noun
    }
  }), [initialValues, namespace, rerender])

  return nouns
}

export function useToggle(initial: boolean): Noun {
  const nouns = useNouns(initial)
  const key = useMemo(() => Math.random().toString(36).substring(2, 8), [])
  return nouns[key]
}

export default useToggles
