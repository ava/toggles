import React, { useEffect } from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToggles } from '../index'

describe('Performance and Rerendering', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  describe('Selective rerendering', () => {
    it('should only rerender components that access state properties', async () => {
      const user = userEvent.setup()
      let renderCountA = 0
      let renderCountB = 0

      function ComponentA() {
        renderCountA++
        const [{ settings }, verbs] = useToggles('global')
        
        return (
          <div>
            <span data-testid="render-a">{renderCountA}</span>
            <button onClick={() => verbs.open(settings)}>Open Settings</button>
          </div>
        )
      }

      function ComponentB() {
        renderCountB++
        const [{ settings }] = useToggles('global')
        
        return (
          <div>
            <span data-testid="render-b">{renderCountB}</span>
            <span data-testid="settings-b">{settings.isOpen ? 'Open' : 'Closed'}</span>
          </div>
        )
      }

      render(
        <>
          <ComponentA />
          <ComponentB />
        </>
      )

      expect(screen.getByTestId('render-a').textContent).toBe('1')
      expect(screen.getByTestId('render-b').textContent).toBe('1')

      // Click to open Settings
      await user.click(screen.getByText('Open Settings'))

      // Both components should rerender when using namespaces
      expect(screen.getByTestId('render-a').textContent).toBe('2')
      expect(screen.getByTestId('render-b').textContent).toBe('2')
    })

    it('should show proper selective rerendering with local toggles', async () => {
      const user = userEvent.setup()
      let renderCountA = 0
      let renderCountB = 0

      function ComponentA() {
        renderCountA++
        const [{ localToggle }, verbs] = useToggles() // No namespace = local
        
        return (
          <div>
            <span data-testid="render-local-a">{renderCountA}</span>
            <button onClick={() => verbs.toggle(localToggle)}>Toggle A</button>
            <span data-testid="state-a">{localToggle.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      function ComponentB() {
        renderCountB++
        const [{ localToggle }] = useToggles() // No namespace = local
        
        return (
          <div>
            <span data-testid="render-local-b">{renderCountB}</span>
            <span data-testid="state-b">{localToggle.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(
        <>
          <ComponentA />
          <ComponentB />
        </>
      )

      expect(screen.getByTestId('render-local-a').textContent).toBe('1')
      expect(screen.getByTestId('render-local-b').textContent).toBe('1')

      // Toggle A's local state
      await user.click(screen.getByText('Toggle A'))

      // Only Component A should rerender (local state)
      expect(screen.getByTestId('render-local-a').textContent).toBe('2')
      expect(screen.getByTestId('render-local-b').textContent).toBe('1')
      
      // States should be independent
      expect(screen.getByTestId('state-a').textContent).toBe('On')
      expect(screen.getByTestId('state-b').textContent).toBe('Off')
    })
  })

  describe('Infinite loop prevention', () => {
    it('should not cause infinite re-renders when toggle is used in useEffect', () => {
      let renderCount = 0

      function TestComponent() {
        renderCount++
        const [{ modal }, verbs] = useToggles()

        // This effect should not cause infinite re-renders
        useEffect(() => {
          if (!modal.isOpen) {
            verbs.open(modal)
          }
        }, [modal.isOpen, verbs, modal])

        return (
          <div data-testid="render-count">{renderCount}</div>
        )
      }

      render(<TestComponent />)

      // Should only render twice: initial render + one update
      expect(screen.getByTestId('render-count').textContent).toBe('2')
    })

    it('should handle rapid toggle state changes without issues', async () => {
      const user = userEvent.setup()
      let renderCount = 0

      function TestComponent() {
        renderCount++
        const [{ rapidToggle }, verbs] = useToggles()

        return (
          <div>
            <span data-testid="render-count">{renderCount}</span>
            <span data-testid="state">{rapidToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => verbs.toggle(rapidToggle)}>Toggle</button>
          </div>
        )
      }

      render(<TestComponent />)

      // Rapidly toggle state
      const button = screen.getByText('Toggle')
      for (let i = 0; i < 10; i++) {
        await user.click(button)
      }

      // Should have rendered 11 times: 1 initial + 10 toggles
      expect(renderCount).toBe(11)
      
      // Final state should be Off (even number of toggles)
      expect(screen.getByTestId('state').textContent).toBe('Off')
    })

    it('should handle simultaneous updates from multiple effects', () => {
      let componentRenders = 0
      let effect1Runs = 0
      let effect2Runs = 0

      function TestComponent() {
        componentRenders++
        const [{ effectToggle1, effectToggle2 }, verbs] = useToggles()

        useEffect(() => {
          effect1Runs++
          if (!effectToggle1.isActive) {
            verbs.activate(effectToggle1)
          }
        }, [effectToggle1, verbs])

        useEffect(() => {
          effect2Runs++
          if (!effectToggle2.isActive) {
            verbs.activate(effectToggle2)
          }
        }, [effectToggle2, verbs])

        return (
          <div>
            <span data-testid="toggle1">{effectToggle1.isActive ? 'On' : 'Off'}</span>
            <span data-testid="toggle2">{effectToggle2.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(<TestComponent />)

      // Both toggles should be active
      expect(screen.getByTestId('toggle1').textContent).toBe('On')
      expect(screen.getByTestId('toggle2').textContent).toBe('On')

      // Should not cause excessive re-renders
      expect(componentRenders).toBeLessThanOrEqual(3)
      expect(effect1Runs).toBeLessThanOrEqual(2)
      expect(effect2Runs).toBeLessThanOrEqual(2)
    })

    it('should handle nested component updates without cascading re-renders', async () => {
      const user = userEvent.setup()
      let parentRenders = 0
      let childRenders = 0

      function ChildComponent({ onToggle }: { onToggle: () => void }) {
        childRenders++
        const [{ childToggle }, verbs] = useToggles()

        return (
          <div>
            <span data-testid="child-renders">{childRenders}</span>
            <button onClick={() => {
              verbs.toggle(childToggle)
              onToggle()
            }}>
              Child Toggle
            </button>
          </div>
        )
      }

      function ParentComponent() {
        parentRenders++
        const [{ parentToggle }, verbs] = useToggles()

        return (
          <div>
            <span data-testid="parent-renders">{parentRenders}</span>
            <ChildComponent onToggle={() => verbs.toggle(parentToggle)} />
          </div>
        )
      }

      render(<ParentComponent />)

      await user.click(screen.getByText('Child Toggle'))

      // Parent should render twice (initial + toggle)
      expect(parentRenders).toBe(2)
      // Child should render twice (initial + parent re-render)
      expect(childRenders).toBe(2)
    })

    it('should properly cleanup subscriptions on unmount', () => {
      const { unmount } = render(
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <TestToggle key={i} id={i} />
          ))}
        </div>
      )

      function TestToggle({ id }: { id: number }) {
        const [{ darkMode }] = useToggles(`namespace-${id}`)
        return <div>{darkMode.isOn ? 'On' : 'Off'}</div>
      }

      // Unmount all components
      unmount()

      // Verify no memory leaks by checking globalNouns subscriptions
      const { globalNouns } = require('../src/globalNouns')
      
      // Check that the global noun store has properly cleaned up
      // After unmounting, the toggles map should have no entries with refCount > 0
      let activeToggles = 0
      globalNouns.toggles.forEach((entry: any) => {
        if (entry.refCount > 0) activeToggles++
      })
      expect(activeToggles).toBe(0)
      
      // Create a new component with same namespace to verify cleanup
      const { container } = render(<TestToggle id={0} />)
      
      // Should render without errors
      expect(container.textContent).toBe('Off')
    })
  })
})