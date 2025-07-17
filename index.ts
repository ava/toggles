import { useRef, useMemo, useReducer, useLayoutEffect } from 'react'
import { globalNouns } from './src/globalNouns'
import { createNounFromState, type Noun } from './src/nouns'
import { verbs } from './src/verbs'

export function useToggles(...args: (string | boolean)[]): Record<string, Noun> {
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
      if (prop in verbs) {
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
  const nouns = useToggles(initial)
  const key = useMemo(() => Math.random().toString(36).substring(2, 8), [])
  return nouns[key]
}

export { type Noun } from './src/nouns'
export { verbs, type Verbs, type Verb, type VerbName } from './src/verbs'
export const {
  open, close,
  show, hide,
  turnOn, turnOff,
  check, uncheck,
  enable, disable,
  expand, collapse,
  activate, deactivate,
  start, end,
  connect, disconnect,
  focus, blur,
  mount, unmount,
  reveal, conceal,
  display, dismiss,
  lock, unlock,
  subscribe, unsubscribe,
  toggle
} = verbs
export default useToggles
