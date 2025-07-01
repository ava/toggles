import { useState, useRef, useMemo, useReducer, useLayoutEffect } from 'react'

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

// noun state mapping object. For any key that maps to true,
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
  isUnchecked: false,
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
        activeRef.current = val
        setActive(val)
      }
    )
  }
  return nounRef.current
}

export function useActions(
  fallbackSetter: (noun: Noun, value: boolean) => void
): Verbs {
  return useMemo(() => {
    const setter = (noun: Noun, value: boolean) => {
      const nounSetter = (noun as any)[NounSetter];
      if (typeof nounSetter === 'function') {
        nounSetter(value);
      } else {
        fallbackSetter(noun, value);
      }
    };
    const verbs: Record<string, (noun: Noun) => void> = {};
    for (const positive of positiveVerbs) {
      const negative = toggleVerbs[positive];
      verbs[positive] = (noun: Noun) => setter(noun, true);
      verbs[negative] = (noun: Noun) => setter(noun, false);
    }
    verbs.toggle = (noun: Noun) => setter(noun, !noun.isActive);
    return verbs as Verbs;
  }, [fallbackSetter]);
}

export function useVerbs(): Verbs {
  return useActions((noun, value) =>
    console.warn(`No setter on noun ${noun.name} for ${value ? 'positive' : 'negative'} action`)
  );
}

export function useToggles(...initialValues: boolean[]): Toggles {
  const rerender = useReducer(() => ({}), 0)[1];
  const states = useRef<Record<string, boolean>>({});
  const nounCache = useRef<Record<string, Noun>>({});
  const index = useRef(0);

  const verbs = useActions((noun, value) => {
    states.current[noun.name] = value;
    rerender();
  });

  const nouns = useMemo(() => new Proxy({} as Record<string, Noun>, {
    get(_, prop: string) {
      if (typeof prop !== 'string') return undefined;
      if (prop in verbs) {
        const isProd = process.env.NODE_ENV === 'production';
        const log = isProd ? console.warn : ((m: string) => { throw new Error(m); });
        log(`Invalid noun name "${prop}": noun names must not conflict with verb names`);
        if (!isProd) return undefined;
      }
      if (nounCache.current[prop]) return nounCache.current[prop];
      states.current[prop] = initialValues[index.current] ?? false;
      const noun = createNounFromState(prop, () => states.current[prop], (val) => {
        states.current[prop] = val;
        rerender();
      });
      nounCache.current[prop] = noun;
      index.current++;
      return noun;
    },
    ownKeys() {
      return Object.keys(states.current);
    },
    getOwnPropertyDescriptor(_, prop: string) {
      return prop in states.current ? { enumerable: true, configurable: true } : undefined;
    }
  }), [initialValues, rerender]);

  return [nouns, verbs];
}

type Toggles = [
  nouns: Record<string, Noun>,
  verbs: Verbs
]

export type Verbs = {
  [K in AllVerbKeys]: (noun: Noun) => void
}

export default useToggles
