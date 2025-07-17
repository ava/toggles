import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { range } from 'lodash'
import { useToggles, verbs, toggle } from '../index'

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  describe('Invalid inputs', () => {
    it('handles special characters in namespace', () => {
      const TestComponent = () => {
        const { sidebar } = useToggles('namespace:with:colons', false)
        return <div>{sidebar.isOpen ? 'open' : 'closed'}</div>
      }
      const { container } = render(<TestComponent />)
      expect(container.textContent).toBe('closed')
    })

    it('ignores changes to initial value after first render', async () => {
      const TestComponent = ({ initial }: { initial: boolean }) => {
        const { modal } = useToggles(initial)
        return (
          <>
            <div data-testid="state">{modal.isOpen ? 'open' : 'closed'}</div>
            <button onClick={() => toggle(modal)}>Toggle</button>
          </>
        )
      }

      const { rerender } = render(<TestComponent initial={false} />)
      expect(screen.getByTestId('state').textContent).toBe('closed')

      // Change the initial prop from false to true
      rerender(<TestComponent initial={true} />)
      // Should still be closed - initial value change shouldn't affect existing noun
      expect(screen.getByTestId('state').textContent).toBe('closed')

      // Toggle to verify the noun is still working
      await userEvent.click(screen.getByText('Toggle'))
      expect(screen.getByTestId('state').textContent).toBe('open')

      // Change initial prop again - should still not affect the noun
      rerender(<TestComponent initial={false} />)
      expect(screen.getByTestId('state').textContent).toBe('open')
    })

    it('ignores changes to initial values for useToggles', async () => {
      const TestComponent = ({ initial1, initial2 }: { initial1: boolean; initial2: boolean }) => {
        const { dropdown, notifications } = useToggles(initial1, initial2)
        return (
          <>
            <div data-testid="dropdown">{dropdown.isExpanded ? 'expanded' : 'collapsed'}</div>
            <div data-testid="notifications">{notifications.isEnabled ? 'enabled' : 'disabled'}</div>
            <button onClick={() => verbs.toggle(dropdown)}>Toggle Dropdown</button>
            <button onClick={() => verbs.toggle(notifications)}>Toggle Notifications</button>
          </>
        )
      }

      const { rerender } = render(<TestComponent initial1={true} initial2={false} />)
      expect(screen.getByTestId('dropdown').textContent).toBe('expanded')
      expect(screen.getByTestId('notifications').textContent).toBe('disabled')

      // Change both initial values
      rerender(<TestComponent initial1={false} initial2={true} />)
      // Should keep their current states
      expect(screen.getByTestId('dropdown').textContent).toBe('expanded')
      expect(screen.getByTestId('notifications').textContent).toBe('disabled')

      // Toggle to verify they still work
      await userEvent.click(screen.getByText('Toggle Dropdown'))
      await userEvent.click(screen.getByText('Toggle Notifications'))
      expect(screen.getByTestId('dropdown').textContent).toBe('collapsed')
      expect(screen.getByTestId('notifications').textContent).toBe('enabled')
    })

    it('handles very long namespace strings', () => {
      const TestComponent = () => {
        const { tooltip } = useToggles('a'.repeat(1000), true)
        return <div>{tooltip.isVisible ? 'visible' : 'hidden'}</div>
      }
      const { container } = render(<TestComponent />)
      expect(container.textContent).toBe('visible')
    })

    it('handles mixed type arguments gracefully', () => {
      const TestComponent = () => {
        // Testing runtime behavior with unusual argument order
        // When first arg is boolean, it's treated as initial value, not namespace
        const nouns = useToggles(true as any, 'namespace' as any, false as any)
        return <div>{Object.keys(nouns).length > 0 ? 'has nouns' : 'no nouns'}</div>
      }
      const { container } = render(<TestComponent />)
      // Nouns are only created once destructured or accessed like nouns.noun
      expect(container.textContent).toBe('no nouns')
    })
  })

  describe('Noun property edge cases', () => {
    it('returns undefined for non-existent properties', () => {
      let noun: any
      const TestComponent = () => {
        const { modal } = useToggles()
        noun = modal
        return null
      }
      render(<TestComponent />)

      expect(noun.nonExistent).toBeUndefined()
      expect(noun['123']).toBeUndefined()
      expect(noun[Symbol('test')]).toBeUndefined()
    })

    it.skip('should handle properties that conflict with object methods', () => {
      // 🤔 I'm not exactly sure what to do in this instance for now. Maybe error in development and console.error on production?
      let capturedNoun: any = null

      function ConflictTester() {
        // Use different noun names that don't conflict with verbs
        const { toString } = useToggles()
        capturedNoun = { toString }
        return <div>Rendered</div>
      }

      render(<ConflictTester />)

      // These should be noun objects with isActive property
      expect(typeof capturedNoun.toString.isActive).toBe('boolean')
      // expect(typeof capturedNoun.numericValue.isActive).toBe('boolean')
      // expect(typeof capturedNoun.builder.isActive).toBe('boolean')
    })

    it('exposes name property on nouns', () => {
      let noun: any
      const ConflictTester = () => {
        const { accordion } = useToggles()
        noun = accordion
        return null
      }
      render(<ConflictTester />)
      expect(noun.name).toBe('accordion')
    })
  })

  describe('Verb error handling', () => {
    it('warns when verbs called with null/undefined', () => {
      // TODO: we need a better warning message here. i.e. 'Must call `toggle(undefined)` with a noun.'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const TestComponent = () => {
        React.useEffect(() => {
          verbs.toggle(null as any)
          verbs.open(undefined as any)
        }, [])
        return null
      }

      render(<TestComponent />)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No setter on noun'))
      consoleSpy.mockRestore()
    })

    it('warns when verbs called with non-noun objects', () => {
      // TODO: we need a better warning message here. i.e. 'Must call `toggle()` with a noun. Currently its `toggle({ isActive: true })`.'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const TestComponent = () => {
        React.useEffect(() => {
          verbs.toggle({ isActive: true } as any)
          verbs.open({} as any)
        }, [])
        return null
      }

      render(<TestComponent />)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No setter on noun'))
      consoleSpy.mockRestore()
    })
  })

  describe('Concurrent updates', () => {
    it('handles simultaneous mount/unmount', () => {
      let mounts = 0, unmounts = 0

      const TestComponent = ({ id }: { id: number }) => {
        React.useEffect(() => {
          mounts++
          return () => { unmounts++ }
        }, [])

        const { websocket } = useToggles('concurrent-test')
        return <div>{websocket.isConnected ? `${id}-connected` : `${id}-disconnected`}</div>
      }

      const { rerender, unmount } = render(
        <>{range(10).map(i => <TestComponent key={i} id={i} />)}</>
      )

      rerender(<>{range(5).map(i => <TestComponent key={i} id={i} />)}</>)
      unmount()

      expect(mounts).toBeGreaterThan(0)
      expect(unmounts).toBeGreaterThan(0)
    })

    it('logs conflicts when same noun initialized with different values', () => {
      // TODO: need better warning message
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

      const components = range(10).map(i => () => {
        const { autoSave } = useToggles('race-test', i % 2 === 0)
        return <div>{autoSave.isEnabled ? 'enabled' : 'disabled'}</div>
      })

      render(<>{components.map((Comp, i) => <Comp key={i} />)}</>)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('initialized with conflicting values')
      )
      consoleSpy.mockRestore()
    })
  })

  describe('Memory and performance', () => {
    it('handles large numbers of nouns', () => {
      const TestComponent = () => {
        const nouns = useToggles(...Array(100).fill(false))
        let count = 0
        for (let i = 0; i < 100; i++) {
          if (!nouns[`widget${i}`].isMounted) count++
        }
        return <div>{count} widgets are unmounted</div>
      }

      const { container } = render(<TestComponent />)
      expect(container.textContent).toBe('100 widgets are unmounted')
    })

    it('handles rapid namespace changes', () => {
      let renders = 0

      const TestComponent = ({ namespace }: { namespace: string }) => {
        renders++
        const { bluetooth } = useToggles(namespace)
        return <div>{bluetooth.isConnected ? 'connected' : 'disconnected'}</div>
      }

      const { rerender } = render(<TestComponent namespace="ns1" />)
      for (let i = 0; i < 20; i++) {
        rerender(<TestComponent namespace={`ns${i}`} />)
      }

      expect(renders).toBe(21)
    })
  })

  describe('Object operations', () => {
    it('allows JSON.stringify on nouns', () => {
      let noun: any
      const TestComponent = () => {
        const { modal } = useToggles(true)
        noun = modal
        return null
      }
      render(<TestComponent />)
      expect(() => JSON.stringify(noun)).not.toThrow()
    })

    it('allows Object.freeze/seal on nouns', () => {
      let noun: any
      const TestComponent = () => {
        const { modal } = useToggles()
        noun = modal
        return null
      }
      render(<TestComponent />)
      expect(() => Object.freeze(noun)).not.toThrow()
      expect(() => Object.seal(noun)).not.toThrow()
    })
  })

  describe('React StrictMode', () => {
    it('handles StrictMode double rendering', () => {
      let effects = 0

      const TestComponent = () => {
        const { menu } = useToggles('strict-test')
        React.useEffect(() => { effects++ })
        return <div>{menu.isOpen ? 'open' : 'closed'}</div>
      }

      render(
        <React.StrictMode>
          <TestComponent />
        </React.StrictMode>
      )
      // In StrictMode with React 18, effects might run twice
      expect(effects).toBeGreaterThanOrEqual(1)
    })
  })

  describe('TTL and cleanup edge cases', () => {
    it('should handle access right before TTL expiration', async () => {
      // This is hard to test precisely due to timing, but we can try
      const { globalNouns } = require('../src/globalNouns')

      // Create a noun and let it sit
      const noun1 = globalNouns.get('ttl-test:noun1', true)

      // Acquire and immediately release to start TTL
      globalNouns.acquire('ttl-test:noun1')
      globalNouns.release('ttl-test:noun1')

      // Access it again after some time but before TTL
      setTimeout(() => {
        const noun2 = globalNouns.get('ttl-test:noun1', true)
        expect(noun2).toBe(noun1) // Should be same instance
      }, 1000)
    })
  })

  describe('Hook rules violations', () => {
    it('should handle conditional hook usage gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

      function ConditionalHookTester({ condition }: { condition: boolean }) {
        // Always call the hook to satisfy rules of hooks
        const { dialog } = useToggles()

        // But conditionally use it
        if (condition) {
          return <div>{dialog.isOpen ? 'open' : 'closed'}</div>
        }

        return <div>No hook</div>
      }

      const { rerender } = render(<ConditionalHookTester condition={false} />)

      // Should not throw since we're following hook rules
      expect(() => {
        rerender(<ConditionalHookTester condition={true} />)
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })
})
