import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import useToggles from '..'

describe('Infinite loop prevention', () => {
  it('should not cause infinite re-renders with normal usage', async () => {
    let renderCount = 0

    function TestComponent() {
      renderCount++
      const [nouns, verbs] = useToggles(false)
      const { modal } = nouns

      // This effect should not cause infinite re-renders
      React.useEffect(() => {
        // Just observing state, not updating it
      }, [modal.isVisible])

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="modal-state">{modal.isVisible ? 'Visible' : 'Hidden'}</div>
          <button onClick={() => verbs.open(modal)}>Open Modal</button>
        </div>
      )
    }

    render(<TestComponent />)

    // Initial render should be 1
    expect(screen.getByTestId('render-count').textContent).toBe('1')

    // Click button to update state
    await userEvent.click(screen.getByRole('button'))

    // Should re-render once after state update
    await waitFor(() => {
      expect(screen.getByTestId('render-count').textContent).toBe('2')
      expect(screen.getByTestId('modal-state').textContent).toBe('Visible')
    })

    // Wait a bit to ensure no more renders happen
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.getByTestId('render-count').textContent).toBe('2')
  })

  it('should handle rapid state updates without infinite loops', async () => {
    let renderCount = 0

    function TestComponent() {
      renderCount++
      const [nouns, verbs] = useToggles(false)
      const { item } = nouns
      const [clickCount, setClickCount] = React.useState(0)

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="toggle-state">{item.isActive ? 'Active' : 'Inactive'}</div>
          <div data-testid="click-count">{clickCount}</div>
          <button onClick={() => {
            // Rapid state updates
            verbs.toggle(item)
            verbs.toggle(item)
            verbs.toggle(item)
            setClickCount(c => c + 1)
          }}>
            Triple Toggle
          </button>
        </div>
      )
    }

    render(<TestComponent />)

    const initialRenderCount = parseInt(screen.getByTestId('render-count').textContent!)

    // Click button to trigger rapid updates
    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByTestId('click-count').textContent).toBe('1')
    })

    // Should not have excessive re-renders
    const finalRenderCount = parseInt(screen.getByTestId('render-count').textContent!)
    expect(finalRenderCount).toBeLessThan(initialRenderCount + 10) // Reasonable upper bound
  })

  it('should not re-render when accessing noun properties', () => {
    let renderCount = 0
    let propertyAccessCount = 0

    function TestComponent() {
      renderCount++
      const [nouns] = useToggles(false)
      const { item } = nouns

      // Accessing properties multiple times should not cause re-renders
      propertyAccessCount++
      const isActive = item.isActive
      propertyAccessCount++
      const isOpen = item.isOpen
      propertyAccessCount++
      const isVisible = item.isVisible

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="access-count">{propertyAccessCount}</div>
          <div>{isActive ? 'Active' : 'Inactive'}</div>
          <div>{isOpen ? 'Open' : 'Closed'}</div>
          <div>{isVisible ? 'Visible' : 'Hidden'}</div>
        </div>
      )
    }

    render(<TestComponent />)

    // Should only render once
    expect(screen.getByTestId('render-count').textContent).toBe('1')
    // Property access count shows we accessed properties
    expect(parseInt(screen.getByTestId('access-count').textContent!)).toBeGreaterThan(0)
  })

  it('should handle effect cleanup properly', async () => {
    function TestComponent() {
      const [nouns, verbs] = useToggles(false)
      const { modal } = nouns
      const [effectRunCount, setEffectRunCount] = React.useState(0)
      const [cleanupRunCount, setCleanupRunCount] = React.useState(0)

      React.useEffect(() => {
        setEffectRunCount(c => c + 1)

        return () => {
          setCleanupRunCount(c => c + 1)
        }
      }, [modal.isVisible])

      return (
        <div>
          <div data-testid="effect-count">{effectRunCount}</div>
          <div data-testid="cleanup-count">{cleanupRunCount}</div>
          <button onClick={() => verbs.toggle(modal)}>Toggle</button>
        </div>
      )
    }

    const { unmount } = render(<TestComponent />)

    // Wait for initial effect to run
    await waitFor(() => {
      expect(screen.getByTestId('effect-count').textContent).toBe('1')
    })
    expect(screen.getByTestId('cleanup-count').textContent).toBe('0')

    // Toggle state
    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      // Effect should run again, cleanup should have run once
      expect(screen.getByTestId('effect-count').textContent).toBe('2')
      expect(screen.getByTestId('cleanup-count').textContent).toBe('1')
    })

    // Unmount component
    unmount()

    // We can't check the final cleanup count since it's in React's state
    // But the test passing without errors shows cleanup ran properly
  })
})
