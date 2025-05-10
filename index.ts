import { useState, useRef, useMemo, useReducer, useLayoutEffect } from 'react'

type PositiveVerb = keyof typeof toggleVerbs         // e.g. "open" | "show" | ...
type NegativeVerb = typeof toggleVerbs[PositiveVerb] // e.g. "close" | "hide" | ...
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

// noun state mapping object. For any key that maps to true,
// the getter will return getActive(), and for false it returns !getActive()
export const nounState: Record<string, boolean> = {
  isActive: true,
  isOpen: true,
  isClosed: false,
  isShown: true,
  isHidden: false,
  isVisible: true,
  isOn: true,
  isOff: false,
  isChecked: true,
  isEnabled: true,
  isDisabled: false,
  isExpanded: true,
  isCollapsed: false,
  isActivated: true,
  isDeactivated: false,
  hasStarted: true,
  hasEnded: false,
  isConnected: true,
  isDisconnected: false,
  isFocused: true,
  isBlurred: false,
  isMounted: true,
  isRevealed: true,
  isConcealed: false,
  isLocked: true,
  isUnlocked: false,
  isSubscribed: true
}

export const NounSetter = Symbol.for('NounSetter')

export type NounState = { [K in keyof typeof nounState]: boolean }
export type Noun = { name: string } & NounState;

export function createNounFromState(
  name: string,
  getActive: () => boolean,
  setActive: (active: boolean) => void
): Noun {
  return new Proxy({}, {
    get(_, prop: PropertyKey) {
      if (typeof prop === 'symbol') {
        if (prop === NounSetter) return setActive
        return undefined
      }
      if (typeof prop === 'string') {
        if (prop === 'name') return name
        if (prop in nounState) {
          return nounState[prop] ? getActive() : !getActive()
        }
      }
      return undefined
    }
  }) as Noun
}

export function useNoun(initial: boolean): Noun {
  const [active, setActive] = useState(initial)
  const activeRef = useRef(active)
  useLayoutEffect(() => {
    activeRef.current = active
  }, [active])
  const name = useMemo(() => Math.random().toString(36).substr(2, 6), [])
  const nounRef = useRef<Noun>()
  if (!nounRef.current) {
    nounRef.current = createNounFromState(
      name,
      () => activeRef.current,
      (val: boolean) => {
        // Update the ref immediately so that getActive returns the new value
        activeRef.current = val
        setActive(val)
      }
    )
  }
  return nounRef.current
}

export type Verbs = {
  [K in AllVerbKeys]: (noun: Noun) => void
}

export function useVerbs(): Verbs {
  return useMemo(() => {
    const v: Record<string, (noun: Noun) => void> = {}
    for (const positive of positiveVerbs) {
      const negative = toggleVerbs[positive as keyof typeof toggleVerbs]
      v[positive] = (noun: Noun) => {
        const setter = (noun as any)[NounSetter]
        if (typeof setter === 'function') {
          setter(true)
        } else {
          console.warn(`No setter on noun ${noun.name} for ${positive}`)
        }
      }
      v[negative] = (noun: Noun) => {
        console.log(`useVerbs: ${negative} called on noun ${noun.name}`)
        const setter = (noun as any)[NounSetter]
        if (typeof setter === 'function') {
          setter(false)
        } else {
          console.warn(`No setter on noun ${noun.name} for ${negative}`)
        }
      }
    }
    v.toggle = (noun: Noun) => {
      const setter = (noun as any)[NounSetter]
      if (typeof setter === 'function') {
        setter(!noun.isActive)
      } else {
        console.warn(`No setter on noun ${noun.name} for toggle`)
      }
    }
    return v as Verbs
  }, [])
}

type Toggles = [
  nouns: Record<string, Noun>,
  verbs: Record<string, (noun: Noun) => void>
]

export function useToggles(...initialValues: boolean[]): Toggles {
  const rerender = useReducer(() => ({}), 0)[1]
  const states = useRef<Record<string, boolean>>({})
  const nounCache = useRef<Record<string, Noun>>({})
  const index = useRef(0)

  // Updated verbs: try to use the noun's own setter if available.
  const verbs = useMemo(() => {
    const v: Record<string, (noun: Noun) => void> = {}
    for (const positive of positiveVerbs) {
      const negative = toggleVerbs[positive as keyof typeof toggleVerbs]
      v[positive] = (noun: Noun) => {
        const setter = (noun as any)[NounSetter]
        if (typeof setter === 'function') {
          setter(true)
        } else {
          states.current[noun.name] = true
          rerender()
        }
      }
      v[negative] = (noun: Noun) => {
        const setter = (noun as any)[NounSetter]
        if (typeof setter === 'function') {
          setter(false)
        } else {
          states.current[noun.name] = false
          rerender()
        }
      }
    }
    v.toggle = (noun: Noun) => {
      const setter = (noun as any)[NounSetter]
      if (typeof setter === 'function') {
        setter(!noun.isActive)
      } else {
        states.current[noun.name] = !states.current[noun.name]
        rerender()
      }
    }
    return v
  }, [rerender])

  const nouns = useMemo(
    () =>
      new Proxy({} as Record<string, Noun>, {
        get(_, prop: string) {
          if (typeof prop !== 'string') return undefined
          if (prop in verbs) {
            if (process.env.NODE_ENV !== 'production') {
              throw new Error(
                `Invalid noun name "${prop}": noun names must not conflict with verb names`
              )
            } else {
              console.error(
                `Invalid noun name "${prop}": noun names must not conflict with verb names`
              )
              return undefined
            }
          }
          if (nounCache.current[prop]) return nounCache.current[prop]
          const initial = initialValues[index.current] ?? false
          states.current[prop] = initial
          const noun = createNounFromState(
            prop,
            () => states.current[prop],
            (val: boolean) => {
              states.current[prop] = val
              rerender()
            }
          )
          nounCache.current[prop] = noun
          index.current++
          return noun
        },
        ownKeys() {
          return Object.keys(states.current)
        },
        getOwnPropertyDescriptor(_, prop: string) {
          if (prop in states.current)
            return { enumerable: true, configurable: true }
          return undefined
        }
      }),
    [initialValues, rerender]
  )

  return [nouns, verbs]
}

export default useToggles
