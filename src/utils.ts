// noun state mapping - true for positive states, false for negative
const positiveStates = ['Active', 'Open', 'Shown', 'Visible', 'On', 'Checked', 'Enabled', 'Expanded', 'Activated', 'Connected', 'Focused', 'Mounted', 'Revealed', 'Locked', 'Subscribed']
const negativeStates = ['Closed', 'Hidden', 'Off', 'Unchecked', 'Disabled', 'Collapsed', 'Deactivated', 'Disconnected', 'Blurred', 'Concealed', 'Unlocked']
const hasStates = ['Started', 'Ended']

export const nounState: Record<string, boolean> = Object.fromEntries([
  ...positiveStates.map(s => [`is${s}`, true]),
  ...negativeStates.map(s => [`is${s}`, false]),
  ...hasStates.map((s, i) => [`has${s}`, i === 0])
])

export const NounSetter = Symbol.for('NounSetter')

export type Noun = { [K in keyof typeof nounState]: boolean }

export function createNounFromState(
  name: string,
  getActive: () => boolean,
  setActive: (active: boolean) => void
): Noun {
  return new Proxy({}, {
    get(_, prop: PropertyKey) {
      if (prop === NounSetter) return setActive
      if (prop === 'name') return name
      if (typeof prop === 'string' && prop in nounState) {
        return nounState[prop] ? getActive() : !getActive()
      }
      return undefined
    }
  }) as Noun
}

export function setNounValue(noun: Noun, value: boolean) {
  if (!noun || typeof noun !== 'object') {
    return console.warn(`No setter on noun for ${value ? 'positive' : 'negative'} action`)
  }
  const nounSetter = (noun as any)[NounSetter]
  if (typeof nounSetter !== 'function') {
    return console.warn(`No setter on noun ${noun.name} for ${value ? 'positive' : 'negative'} action`)
  }
  nounSetter(value)
}