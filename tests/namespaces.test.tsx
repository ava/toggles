import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToggles } from '../index'

describe('Namespaces and Global State', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  describe('Global state sharing within namespace', () => {
    it('should share toggle state between sibling components without prop passing', async () => {
      const user = userEvent.setup()

      function ComponentA() {
        const [nouns, verbs] = useToggles('global')
        const { modal } = nouns

        return (
          <div>
            <span data-testid="modal-state-a">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => verbs.open(modal)}>Open Modal A</button>
          </div>
        )
      }

      function ComponentB() {
        const [nouns, verbs] = useToggles('global')
        const { modal } = nouns

        return (
          <div>
            <span data-testid="modal-state-b">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => verbs.close(modal)}>Close Modal B</button>
          </div>
        )
      }

      function App() {
        return (
          <>
            <ComponentA />
            <ComponentB />
          </>
        )
      }

      render(<App />)

      // Initially both should show closed
      expect(screen.getByTestId('modal-state-a').textContent).toBe('Closed')
      expect(screen.getByTestId('modal-state-b').textContent).toBe('Closed')

      // Open modal from Component A
      await user.click(screen.getByText('Open Modal A'))

      // Both components should show open
      expect(screen.getByTestId('modal-state-a').textContent).toBe('Open')
      expect(screen.getByTestId('modal-state-b').textContent).toBe('Open')

      // Close modal from Component B
      await user.click(screen.getByText('Close Modal B'))

      // Both components should show closed
      expect(screen.getByTestId('modal-state-a').textContent).toBe('Closed')
      expect(screen.getByTestId('modal-state-b').textContent).toBe('Closed')
    })

    it('should maintain unique global state for different noun names', async () => {
      const user = userEvent.setup()

      function TestComponent() {
        const [nouns, verbs] = useToggles('global')
        const { drawer, sidebar } = nouns

        return (
          <div>
            <span data-testid="drawer">{drawer.isOpen ? 'Open' : 'Closed'}</span>
            <span data-testid="sidebar">{sidebar.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => verbs.toggle(drawer)}>Toggle Drawer</button>
            <button onClick={() => verbs.toggle(sidebar)}>Toggle Sidebar</button>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('drawer').textContent).toBe('Closed')
      expect(screen.getByTestId('sidebar').textContent).toBe('Closed')

      await user.click(screen.getByText('Toggle Drawer'))
      
      expect(screen.getByTestId('drawer').textContent).toBe('Open')
      expect(screen.getByTestId('sidebar').textContent).toBe('Closed')

      await user.click(screen.getByText('Toggle Sidebar'))
      
      expect(screen.getByTestId('drawer').textContent).toBe('Open')
      expect(screen.getByTestId('sidebar').textContent).toBe('Open')
    })

    it('should handle initial values correctly with global toggles', () => {
      function FirstComponent() {
        const [nouns] = useToggles('global', true, false)
        const { darkMode, autoSave } = nouns

        return (
          <div>
            <span data-testid="darkMode-first">{darkMode.isActive ? 'On' : 'Off'}</span>
            <span data-testid="autoSave-first">{autoSave.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      function SecondComponent() {
        const [nouns] = useToggles('global')
        const { darkMode, autoSave } = nouns

        return (
          <div>
            <span data-testid="darkMode-second">{darkMode.isActive ? 'On' : 'Off'}</span>
            <span data-testid="autoSave-second">{autoSave.isActive ? 'On' : 'Off'}</span>
          </div>
        )
      }

      const { rerender } = render(<FirstComponent />)
      
      // First component sets initial values
      expect(screen.getByTestId('darkMode-first').textContent).toBe('On')
      expect(screen.getByTestId('autoSave-first').textContent).toBe('Off')

      // Add second component - should use same global state
      rerender(
        <>
          <FirstComponent />
          <SecondComponent />
        </>
      )

      expect(screen.getByTestId('darkMode-second').textContent).toBe('On')
      expect(screen.getByTestId('autoSave-second').textContent).toBe('Off')
    })
  })

  describe('Namespace isolation', () => {
    it('should isolate toggles between different namespaces', async () => {
      const user = userEvent.setup()

      function FeatureA() {
        const [{ modal }, verbs] = useToggles('featureA')
        
        return (
          <div>
            <span data-testid="feature-a-modal">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => verbs.open(modal)}>Open Feature A Modal</button>
          </div>
        )
      }

      function FeatureB() {
        const [{ modal }, verbs] = useToggles('featureB')
        
        return (
          <div>
            <span data-testid="feature-b-modal">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => verbs.open(modal)}>Open Feature B Modal</button>
          </div>
        )
      }

      render(
        <>
          <FeatureA />
          <FeatureB />
        </>
      )

      // Open Feature A modal
      await user.click(screen.getByText('Open Feature A Modal'))

      // Only Feature A modal should be open
      expect(screen.getByTestId('feature-a-modal').textContent).toBe('Open')
      expect(screen.getByTestId('feature-b-modal').textContent).toBe('Closed')
    })

    it('should work with dynamic namespaces for lists', () => {
      const items = [
        { id: 'item-1', name: 'Item 1' },
        { id: 'item-2', name: 'Item 2' },
        { id: 'item-3', name: 'Item 3' }
      ]

      function ListItem({ item }: { item: typeof items[0] }) {
        const [{ expanded }, verbs] = useToggles(`list-${item.id}`, false)
        
        return (
          <div>
            <button onClick={() => verbs.toggle(expanded)}>
              {item.name}
            </button>
            {expanded.isOpen && <div data-testid={`expanded-${item.id}`}>Details</div>}
          </div>
        )
      }

      function List() {
        return (
          <>
            {items.map(item => <ListItem key={item.id} item={item} />)}
          </>
        )
      }

      render(<List />)

      // All items should start collapsed
      expect(screen.queryByTestId('expanded-item-1')).toBeNull()
      expect(screen.queryByTestId('expanded-item-2')).toBeNull()
      expect(screen.queryByTestId('expanded-item-3')).toBeNull()
    })
  })

  describe('Local vs Global toggles', () => {
    it('should keep local toggles isolated (no namespace)', async () => {
      const user = userEvent.setup()

      function ComponentA() {
        const [{ localToggle }, verbs] = useToggles(true)
        
        return (
          <div>
            <span data-testid="local-a">{localToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => verbs.toggle(localToggle)}>Toggle A</button>
          </div>
        )
      }

      function ComponentB() {
        const [{ localToggle }, verbs] = useToggles(false)
        
        return (
          <div>
            <span data-testid="local-b">{localToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => verbs.toggle(localToggle)}>Toggle B</button>
          </div>
        )
      }

      render(
        <>
          <ComponentA />
          <ComponentB />
        </>
      )

      // Initial states
      expect(screen.getByTestId('local-a').textContent).toBe('On')
      expect(screen.getByTestId('local-b').textContent).toBe('Off')

      // Toggle A
      await user.click(screen.getByText('Toggle A'))

      // Only A should change
      expect(screen.getByTestId('local-a').textContent).toBe('Off')
      expect(screen.getByTestId('local-b').textContent).toBe('Off')
    })

    it('should handle mixing boolean and namespace arguments correctly', () => {
      function TestComponent() {
        // These should all work correctly
        useToggles(true, false, true)
        useToggles('global', true, false, true)
        useToggles()
        
        return (
          <div>
            <span data-testid="test">OK</span>
          </div>
        )
      }

      render(<TestComponent />)
      expect(screen.getByTestId('test').textContent).toBe('OK')
    })
  })

  describe('Conflicting initial values', () => {
    it('should show error for conflicting global initial values', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      function ComponentA() {
        const [{ conflict }] = useToggles('global', true)
        return <div>{conflict.isActive ? 'On' : 'Off'}</div>
      }

      function ComponentB() {
        const [{ conflict }] = useToggles('global', false)
        return <div>{conflict.isActive ? 'On' : 'Off'}</div>
      }

      render(
        <>
          <ComponentA />
          <ComponentB />
        </>
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Global toggle "global:conflict" initialized with conflicting values!')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('First initialization: true')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Second initialization: false')
      )

      consoleSpy.mockRestore()
    })
  })
})