import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToggles, toggle, open, close } from '../index'

describe('Namespaces and Global State', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  describe('Global state sharing within namespace', () => {
    it('should share toggle state between sibling components without prop passing', async () => {
      const user = userEvent.setup()

      function ModalTrigger() {
        const { modal } = useToggles('global')

        return (
          <div>
            <span data-testid="modal-state-a">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => open(modal)}>Open Modal</button>
          </div>
        )
      }

      function Modal() {
        const { modal } = useToggles('global')

        return (
          <div>
            <span data-testid="modal-state-b">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => close(modal)}>Close Modal</button>
          </div>
        )
      }

      render(<><ModalTrigger /><Modal /></>)

      // Initially both should show closed
      expect(screen.getByTestId('modal-state-a').textContent).toBe('Closed')
      expect(screen.getByTestId('modal-state-b').textContent).toBe('Closed')

      // Open modal from ModalTrigger
      await user.click(screen.getByText('Open Modal'))

      // Both components should show open
      expect(screen.getByTestId('modal-state-a').textContent).toBe('Open')
      expect(screen.getByTestId('modal-state-b').textContent).toBe('Open')

      // Close modal from Modal
      await user.click(screen.getByText('Close Modal'))

      // Both components should show closed
      expect(screen.getByTestId('modal-state-a').textContent).toBe('Closed')
      expect(screen.getByTestId('modal-state-b').textContent).toBe('Closed')
    })

    it('should handle reactive access order', () => {
      function ReactiveTest() {
        const nouns = useToggles('global')
        const [renderCount, setRenderCount] = React.useState(0)

        // Test reactive access - noun is created on first access
        React.useEffect(() => {
          if (renderCount < 3) {
            setRenderCount(renderCount + 1)
          }
        }, [renderCount])

        // Access should create the noun dynamically
        const hasModal = 'modal' in nouns
        return <div data-testid="has-modal">{hasModal ? 'yes' : 'no'}</div>
      }

      render(<ReactiveTest />)
      expect(screen.getByTestId('has-modal').textContent).toBe('no')
    })

    it('should maintain unique global state for different noun names', async () => {
      const user = userEvent.setup()

      function DrawerAndSidebar() {
        const { drawer, sidebar } = useToggles('global')

        return (
          <div>
            <span data-testid="drawer">{drawer.isOpen ? 'Open' : 'Closed'}</span>
            <span data-testid="sidebar">{sidebar.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => toggle(drawer)}>Toggle Drawer</button>
            <button onClick={() => toggle(sidebar)}>Toggle Sidebar</button>
          </div>
        )
      }

      render(<DrawerAndSidebar />)

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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

      function SettingsProvider() {
        const { darkMode, autoSave, document } = useToggles('global', true, false, true)

        return (
          <div>
            <span data-testid="darkMode-first">{darkMode.isOn ? 'On' : 'Off'}</span>
            <span data-testid="autoSave-first">{autoSave.isEnabled ? 'Enabled' : 'Disabled'}</span>
            <span data-testid="document-first">{document.isLocked ? 'Locked' : 'Unlocked'}</span>
          </div>
        )
      }

      function SettingsDisplay() {
        const { darkMode, autoSave, document } = useToggles('global')

        return (
          <div>
            <span data-testid="darkMode-second">{darkMode.isOn ? 'On' : 'Off'}</span>
            <span data-testid="autoSave-second">{autoSave.isEnabled ? 'Enabled' : 'Disabled'}</span>
            <span data-testid="document-second">{document.isLocked ? 'Locked' : 'Unlocked'}</span>
          </div>
        )
      }

      const { rerender } = render(<SettingsProvider />)

      // First component sets initial values
      expect(screen.getByTestId('darkMode-first').textContent).toBe('On')
      expect(screen.getByTestId('autoSave-first').textContent).toBe('Disabled')
      expect(screen.getByTestId('document-first').textContent).toBe('Locked')

      // Add second component - should use same global state
      rerender(<><SettingsProvider /><SettingsDisplay /></>)

      expect(screen.getByTestId('darkMode-second').textContent).toBe('On')
      expect(screen.getByTestId('autoSave-second').textContent).toBe('Disabled')
      expect(screen.getByTestId('document-second').textContent).toBe('Locked')

      consoleSpy.mockRestore()
    })
  })

  describe('Namespace isolation', () => {
    it('should isolate toggles between different namespaces', async () => {
      const user = userEvent.setup()

      function SiblingA() {
        const { modal } = useToggles('siblingA')

        return (
          <div>
            <span data-testid="feature-a-modal">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => open(modal)}>Open Feature A Modal</button>
          </div>
        )
      }

      function SiblingB() {
        const { modal } = useToggles('siblingB')

        return (
          <div>
            <span data-testid="feature-b-modal">{modal.isOpen ? 'Open' : 'Closed'}</span>
            <button onClick={() => open(modal)}>Open Feature B Modal</button>
          </div>
        )
      }

      render(<><SiblingA /><SiblingB /></>)

      // Open Feature A modal
      await user.click(screen.getByText('Open Feature A Modal'))

      // Only Feature A modal should be open
      expect(screen.getByTestId('feature-a-modal').textContent).toBe('Open')
      expect(screen.getByTestId('feature-b-modal').textContent).toBe('Closed')
    })

    it('should work with dynamic namespaces for lists', () => {
      function ListItem({ id }: { id: number }) {
        const { dropdown } = useToggles(`item-${id}`, false)
        return (
          <div>
            <button onClick={() => toggle(dropdown)}>Item {id}</button>
            {dropdown.isExpanded && <div data-testid={`dropdown-item-${id}`}>Dropdown Items</div>}
          </div>
        )
      }

      render(<>{[1, 2, 3].map(id => <ListItem key={id} id={id} />)}</>)

      // All items should start collapsed
      expect(screen.queryByTestId('dropdown-item-1')).toBeNull()
      expect(screen.queryByTestId('dropdown-item-2')).toBeNull()
      expect(screen.queryByTestId('dropdown-item-3')).toBeNull()
    })
  })

  describe('Local vs Global toggles', () => {
    it('should keep local toggles isolated (no namespace)', async () => {
      const user = userEvent.setup()

      function LocalWidgetA() {
        const { localToggle } = useToggles(true)

        return (
          <div>
            <span data-testid="local-a">{localToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => toggle(localToggle)}>Toggle A</button>
          </div>
        )
      }

      function LocalWidgetB() {
        const { localToggle } = useToggles(false)

        return (
          <div>
            <span data-testid="local-b">{localToggle.isActive ? 'On' : 'Off'}</span>
            <button onClick={() => toggle(localToggle)}>Toggle B</button>
          </div>
        )
      }

      render(<><LocalWidgetA /><LocalWidgetB /></>)

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
      function ArgumentTester() {
        // These should all work correctly
        useToggles(true, false, true)
        useToggles('global', true, false, true)
        useToggles()
        return <span data-testid="test">OK</span>
      }

      render(<ArgumentTester />)
      expect(screen.getByTestId('test').textContent).toBe('OK')
    })
  })

  describe('Conflicting initial values', () => {
    it('should show error for conflicting global initial values', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

      function GlobalWidgetA() {
        const { conflict } = useToggles('global', true)
        return <div>{conflict.isActive ? 'On' : 'Off'}</div>
      }

      function GlobalWidgetB() {
        const { conflict } = useToggles('global', false)
        return <div>{conflict.isActive ? 'On' : 'Off'}</div>
      }

      render(<><GlobalWidgetA /><GlobalWidgetB /></>)

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
