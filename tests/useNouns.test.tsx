import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNouns, useToggle, useVerbs } from '../index'

describe('useNouns and useToggle hooks', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  describe('useNouns', () => {
    it('should create multiple nouns with proper initial states', () => {
      function TestComponent() {
        const { settings, notifications, darkMode } = useNouns(true, false, true)
        
        return (
          <div>
            <span data-testid="settings">{settings.isOpen ? 'Open' : 'Closed'}</span>
            <span data-testid="notifications">{notifications.isEnabled ? 'Enabled' : 'Disabled'}</span>
            <span data-testid="darkMode">{darkMode.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('settings').textContent).toBe('Open')
      expect(screen.getByTestId('notifications').textContent).toBe('Disabled')
      expect(screen.getByTestId('darkMode').textContent).toBe('On')
    })

    it('should work with destructuring and maintain order', () => {
      function TestComponent() {
        const { modal, drawer, sidebar } = useNouns(false, true, false)
        
        return (
          <div>
            <span data-testid="modal">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <span data-testid="drawer">{drawer.isOpen ? 'Open' : 'Closed'}</span>
            <span data-testid="sidebar">{sidebar.isOpen ? 'Open' : 'Closed'}</span>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('modal').textContent).toBe('Closed')
      expect(screen.getByTestId('drawer').textContent).toBe('Open')
      expect(screen.getByTestId('sidebar').textContent).toBe('Closed')
    })

    it('should throw error when noun name conflicts with verb', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      function TestComponent() {
        try {
          const { open } = useNouns() // This should throw
          console.log(open) // Use it to avoid unused variable warning
          return <div>Should not render</div>
        } catch (error) {
          return <div data-testid="error">{(error as Error).message}</div>
        }
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('error').textContent).toContain('Invalid noun name "open"')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should work with namespace argument', async () => {
      const user = userEvent.setup()

      function ComponentA() {
        const nouns = useNouns('test-namespace', true)
        const verbs = useVerbs()
        
        return (
          <div>
            <span data-testid="a-setting">{nouns.setting?.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => verbs.toggle(nouns.setting)}>Toggle A</button>
          </div>
        )
      }

      function ComponentB() {
        const { setting } = useNouns('test-namespace', true)
        
        return (
          <div>
            <span data-testid="b-setting">{setting?.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(
        <>
          <ComponentA />
          <ComponentB />
        </>
      )
      
      // Both should show same initial state
      expect(screen.getByTestId('a-setting').textContent).toBe('On')
      expect(screen.getByTestId('b-setting').textContent).toBe('On')
      
      // Toggle from A
      await user.click(screen.getByText('Toggle A'))
      
      // Both should update
      expect(screen.getByTestId('a-setting').textContent).toBe('Off')
      expect(screen.getByTestId('b-setting').textContent).toBe('Off')
    })
  })

  describe('useToggle', () => {
    it('should create a single noun with initial state', () => {
      function TestComponent() {
        const noun = useToggle(true)
        
        return (
          <div>
            <span data-testid="state">{noun.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('state').textContent).toBe('On')
    })

    it('should work with verbs', async () => {
      const user = userEvent.setup()
      let renderCount = 0

      function TestComponent() {
        renderCount++
        const darkMode = useToggle(false)
        const verbs = useVerbs()
        
        return (
          <div>
            <span data-testid="render-count">{renderCount}</span>
            <span data-testid="state">{darkMode.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => verbs.toggle(darkMode)}>Toggle</button>
            <button onClick={() => verbs.activate(darkMode)}>Activate</button>
            <button onClick={() => verbs.deactivate(darkMode)}>Deactivate</button>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('state').textContent).toBe('Off')
      expect(screen.getByTestId('render-count').textContent).toBe('1')
      
      await user.click(screen.getByText('Toggle'))
      
      // Check if component re-rendered
      expect(screen.getByTestId('render-count').textContent).toBe('2')
      expect(screen.getByTestId('state').textContent).toBe('On')
      
      await user.click(screen.getByText('Deactivate'))
      expect(screen.getByTestId('state').textContent).toBe('Off')
      
      await user.click(screen.getByText('Activate'))
      expect(screen.getByTestId('state').textContent).toBe('On')
    })

    it('should have all expected noun properties', () => {
      let capturedNoun: any = null

      function TestComponent() {
        const noun = useToggle(false)
        capturedNoun = noun
        
        return <div data-testid="test">Rendered</div>
      }

      render(<TestComponent />)
      
      // Check common noun properties
      expect(capturedNoun).toBeDefined()
      expect(typeof capturedNoun.isActive).toBe('boolean')
      expect(typeof capturedNoun.isOpen).toBe('boolean')
      expect(typeof capturedNoun.isShown).toBe('boolean')
      expect(typeof capturedNoun.isEnabled).toBe('boolean')
      expect(typeof capturedNoun.isChecked).toBe('boolean')
      expect(typeof capturedNoun.hasStarted).toBe('boolean')
      expect(typeof capturedNoun.hasEnded).toBe('boolean')
    })
  })
})