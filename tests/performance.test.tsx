import React, { useEffect, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToggles, toggle, open } from '../index'

describe('Performance and Rerendering', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  describe('Global state optimization - Selective rerendering', () => {
    it('should share toggles efficiently between components', async () => {
      const user = userEvent.setup()
      let settingsProviderRenders = 0
      let settingsDisplayRenders = 0

      function SettingsProvider() {
        settingsProviderRenders++
        const { settings } = useToggles('global')

        return (
          <div>
            <span data-testid="provider-renders">{settingsProviderRenders}</span>
            <span data-testid="provider-state">{settings.isEnabled ? 'On' : 'Off'}</span>
            <button onClick={() => toggle(settings)}>Toggle Provider</button>
          </div>
        )
      }

      function SettingsDisplay() {
        settingsDisplayRenders++
        const { settings } = useToggles('global')

        return (
          <div>
            <span data-testid="display-renders">{settingsDisplayRenders}</span>
            <span data-testid="display-state">{settings.isEnabled ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(<><SettingsProvider /><SettingsDisplay /></>)

      // Initial renders
      expect(screen.getByTestId('provider-renders').textContent).toBe('1')
      expect(screen.getByTestId('display-renders').textContent).toBe('1')

      // Toggle should trigger re-render in both components
      await user.click(screen.getByText('Toggle Provider'))

      // Both components should rerender when using namespaces - since they both are accessing state from the same global noun
      expect(screen.getByTestId('provider-renders').textContent).toBe('2')
      expect(screen.getByTestId('display-renders').textContent).toBe('2')
      expect(screen.getByTestId('provider-state').textContent).toBe('On')
      expect(screen.getByTestId('display-state').textContent).toBe('On')
    })

    it('should show proper selective rerendering with local toggles', async () => {
      const user = userEvent.setup()
      let componentARenders = 0
      let componentBRenders = 0

      function ComponentA() {
        componentARenders++
        const { localToggle } = useToggles() // No namespace = local

        return (
          <div>
            <span data-testid="component-a-renders">{componentARenders}</span>
            <span data-testid="component-a-state">{localToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => toggle(localToggle)}>Toggle A</button>
          </div>
        )
      }

      function ComponentB() {
        componentBRenders++
        const { localToggle } = useToggles() // No namespace = local

        return (
          <div>
            <span data-testid="component-b-renders">{componentBRenders}</span>
            <span data-testid="component-b-state">{localToggle.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(<><ComponentA /><ComponentB /></>)

      // Initial renders
      expect(screen.getByTestId('component-a-renders').textContent).toBe('1')
      expect(screen.getByTestId('component-b-renders').textContent).toBe('1')

      // Toggle A should only re-render A, not B (they have separate local state)
      await user.click(screen.getByText('Toggle A'))

      expect(screen.getByTestId('component-a-renders').textContent).toBe('2')
      expect(screen.getByTestId('component-b-renders').textContent).toBe('1') // Should not re-render
      expect(screen.getByTestId('component-a-state').textContent).toBe('On')
      expect(screen.getByTestId('component-b-state').textContent).toBe('Off') // Separate state
    })
  })

  describe('Infinite loop prevention', () => {
    it('should not cause infinite re-renders when toggle is used in useEffect', () => {
      let renderCount = 0

      function TestComponent() {
        renderCount++
        const { modal } = useToggles()

        // This effect should not cause infinite re-renders
        useEffect(() => {
          if (!modal.isOpen) {
            open(modal)
          }
        }, [modal.isOpen, modal])

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
        const { rapidToggle } = useToggles()

        return (
          <div>
            <span data-testid="render-count">{renderCount}</span>
            <span data-testid="state">{rapidToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => toggle(rapidToggle)}>Toggle</button>
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

    it('should handle useEffect dependencies correctly', () => {
      function TestComponent() {
        const [effectCount, setEffectCount] = useState(0)
        const { effectToggle1, effectToggle2 } = useToggles()

        useEffect(() => {
          setEffectCount(count => count + 1)
        }, [effectToggle1, effectToggle2]) // Depending on both toggles

        return (
          <div>
            <span data-testid="effect-count">{effectCount}</span>
            <button onClick={() => toggle(effectToggle1)}>Toggle 1</button>
            <button onClick={() => toggle(effectToggle2)}>Toggle 2</button>
          </div>
        )
      }

      render(<TestComponent />)

      // Effect should run once on initial render
      expect(screen.getByTestId('effect-count').textContent).toBe('1')
    })
  })

  describe('Parent-child rendering', () => {
    it('should handle parent-child component rendering efficiently', async () => {
      const user = userEvent.setup()
      let parentRenders = 0
      let childRenders = 0

      function Child() {
        childRenders++
        const { childToggle } = useToggles()

        return (
          <div>
            <span data-testid="child-renders">{childRenders}</span>
            <span data-testid="child-state">{childToggle.isVisible ? 'Visible' : 'Hidden'}</span>
            <button onClick={() => toggle(childToggle)}>Toggle Child</button>
          </div>
        )
      }

      function Parent() {
        parentRenders++
        const { parentToggle } = useToggles()

        return (
          <div>
            <span data-testid="parent-renders">{parentRenders}</span>
            <span data-testid="parent-state">{parentToggle.isExpanded ? 'Expanded' : 'Collapsed'}</span>
            <button onClick={() => toggle(parentToggle)}>Toggle Parent</button>
            <Child />
          </div>
        )
      }

      render(<Parent />)

      // Initial renders
      expect(screen.getByTestId('parent-renders').textContent).toBe('1')
      expect(screen.getByTestId('child-renders').textContent).toBe('1')

      // Toggle child should not re-render parent
      await user.click(screen.getByText('Toggle Child'))
      expect(screen.getByTestId('parent-renders').textContent).toBe('1')
      expect(screen.getByTestId('child-renders').textContent).toBe('2')

      // Toggle parent will re-render both parent and child (normal React behavior)
      await user.click(screen.getByText('Toggle Parent'))
      expect(screen.getByTestId('parent-renders').textContent).toBe('2')
      expect(screen.getByTestId('child-renders').textContent).toBe('3')
    })

    it('should handle component unmounting correctly', () => {
      const { globalNouns } = require('../src/globalNouns')

      function TestComponent({ id }: { id: number }) {
        const { darkMode } = useToggles(`namespace-${id}`)
        return <div>{darkMode.isEnabled ? 'enabled' : 'disabled'}</div>
      }

      const { rerender } = render(
        <div>
          {[1, 2, 3].map(id => <TestComponent key={id} id={id} />)}
        </div>
      )

      // Check that the global noun store has properly cleaned up
      // After unmounting, the toggles map should have no entries with refCount > 0
      let activeToggles = 0
      globalNouns.toggles.forEach((entry: any) => {
        if (entry.refCount > 0) activeToggles++
      })
      expect(activeToggles).toBe(3)

      // Unmount components
      rerender(<div></div>)

      // Now should be 0
      activeToggles = 0
      globalNouns.toggles.forEach((entry: any) => {
        if (entry.refCount > 0) activeToggles++
      })
      expect(activeToggles).toBe(0)
    })
  })
})
