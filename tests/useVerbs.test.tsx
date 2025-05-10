import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNoun, useVerbs, useToggles, nounState, positiveVerbs, negativeVerbs } from '..'

function TestDynamicVerbs({ initial = false }: { initial?: boolean }) {
  const noun = useNoun(initial)
  const verbs = useVerbs()

  // Render all derived state as JSON for assertions.
  // This shows an object with keys from nounState and their current values.
  const stateDisplay = JSON.stringify(
    Object.fromEntries(
      Object.keys(nounState).map((key) => [key, (noun as any)[key]])
    )
  )

  return (
    <div>
      <div data-testid="noun-json">{stateDisplay}</div>
      {/* Render a button for each positive verb using a unique test id */}
      {positiveVerbs.map((verb) => (
        <button
          key={`pos-${verb}`}
          data-testid={`verb-${verb}`}
          onClick={() => verbs[verb](noun)}
        >
          {verb}
        </button>
      ))}
      {/* Render a button for each negative verb using a unique test id */}
      {negativeVerbs.map((verb) => (
        <button
          key={`neg-${verb}`}
          data-testid={`verb-${verb}`}
          onClick={() => verbs[verb](noun)}
        >
          {verb}
        </button>
      ))}
      {/* Render a toggle button */}
      <button data-testid="verb-toggle" onClick={() => verbs.toggle(noun)}>
        toggle
      </button>
    </div>
  )
}

function getNounState() {
  const json = screen.getByTestId('noun-json').textContent
  return json ? JSON.parse(json) : {}
}

describe('useVerbs dynamic tests', () => {
  describe('positive verbs', () => {
    // For each positive verb, we run a separate test
    it.each(positiveVerbs)(
      'should set noun to active with verb "%s"',
      async (verb) => {
        render(<TestDynamicVerbs initial={false} />)
        await userEvent.click(screen.getByTestId(`verb-${verb}`))
        await waitFor(() => {
          const state = getNounState()
          // For a positive verb, the underlying state becomes true.
          // So for each key in nounState, the derived value equals nounState[key].
          Object.keys(nounState).forEach((key) => {
            expect(state[key]).toBe(nounState[key])
          })
        })
      }
    )
  })

  describe('negative verbs', () => {
    it.each(negativeVerbs)(
      'should set noun to inactive with verb "%s"',
      async (verb) => {
        render(<TestDynamicVerbs initial={true} />)
        await userEvent.click(screen.getByTestId(`verb-${verb}`))
        await waitFor(() => {
          const state = getNounState()
          // When a negative verb is applied, the underlying state becomes false.
          // Thus each derived key should equal the negation of nounState[key].
          Object.keys(nounState).forEach((key) => {
            expect(state[key]).toBe(!nounState[key])
          })
        })
      }
    )
  })

  it('should toggle the state correctly', async () => {
    render(<TestDynamicVerbs initial={false} />)
    // First, click a positive verb to set the noun active. Use "check" as an example.
    await userEvent.click(screen.getByTestId('verb-check'))
    await waitFor(() => {
      const state = getNounState()
      Object.keys(nounState).forEach((key) => {
        expect(state[key]).toBe(nounState[key])
      })
    })

    // Then click the toggle button to invert the state.
    await userEvent.click(screen.getByTestId('verb-toggle'))
    await waitFor(() => {
      const state = getNounState()
      Object.keys(nounState).forEach((key) => {
        expect(state[key]).toBe(!nounState[key])
      })
    })
  })
})


/**
 * Test case 1:
 * Use useToggles to get verbs and useNoun to create a noun.
 * Then call a verb from useToggles on the noun from useNoun.
 */
function InteropTest1() {
  const noun = useNoun(false) // starts inactive
  // Get verbs from useToggles (ignore nouns output)
  const [, verbs] = useToggles()
  return (
    <div>
      <div data-testid="interop1">
        {noun.isActive ? 'Active' : 'Inactive'}
      </div>
      <button data-testid="interop1-toggle" onClick={() => verbs.toggle(noun)}>
        Toggle via useToggles
      </button>
    </div>
  )
}

/**
 * Test case 2:
 * Use useToggles to get a noun and useVerbs to get verbs.
 * Then call a verb from useVerbs on the noun from useToggles.
 */
function InteropTest2({ initialValues = [false] }: { initialValues?: boolean[] }) {
  const [nouns] = useToggles(...initialValues)
  // Destructure a noun (we use "sidebar" as an example)
  const { sidebar } = nouns
  const { check } = useVerbs()
  return (
    <div>
      <div data-testid="interop2">
        {sidebar.isChecked ? 'Checked' : 'Unchecked'}
      </div>
      <button data-testid="interop2-check" onClick={() => check(sidebar)}>
        Check via useVerbs
      </button>
    </div>
  )
}

describe('Interoperability between useToggles, useNoun, and useVerbs', () => {
  it('updates noun state when using useToggles verbs on a noun from useNoun', async () => {
    render(<InteropTest1 />)
    const stateEl = screen.getByTestId('interop1')
    const toggleBtn = screen.getByTestId('interop1-toggle')

    // Initially, the noun is inactive.
    expect(stateEl.textContent).toBe('Inactive')

    // Click toggle (should set state to active).
    await act(async () => {
      await userEvent.click(toggleBtn)
    })
    await waitFor(() => {
      expect(stateEl.textContent).toBe('Active')
    })

    // Click toggle again (should revert to inactive).
    await act(async () => {
      await userEvent.click(toggleBtn)
    })
    await waitFor(() => {
      expect(stateEl.textContent).toBe('Inactive')
    })
  })

  it('updates noun state when using useVerbs verbs on a noun from useToggles', async () => {
    // Start with sidebar initially unchecked (false).
    render(<InteropTest2 initialValues={[false]} />)
    const stateEl = screen.getByTestId('interop2')
    const checkBtn = screen.getByTestId('interop2-check')

    expect(stateEl.textContent).toBe('Unchecked')

    // Click the "Check" button from useVerbs.
    await act(async () => {
      await userEvent.click(checkBtn)
    })
    await waitFor(() => {
      expect(stateEl.textContent).toBe('Checked')
    })
  })
})
