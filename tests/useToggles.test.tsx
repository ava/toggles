import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import useToggles, { verbs } from '..'

const { show, hide, toggle, check, uncheck, open, close, expand, collapse } = verbs

/**
 * TestComponent wraps useToggles and renders four common toggle use cases:
 * - modal (with its "isShown" state)
 * - checkbox (with its "isChecked" state)
 * - sidebar (with its "isOpen" state)
 * - accordion (with its "isExpanded" state)
 * 
 * It also renders buttons that trigger verb functions for each noun.
 */
function TestComponent({ initialValues = [false, false, false, false] }: { initialValues?: boolean[] }) {
  const { modal, checkbox, sidebar, accordion } = useToggles(...initialValues)
  return (
    <div>
      <div data-testid="modal">
        Modal: {modal.isShown ? 'Open' : 'Closed'}
      </div>
      <div data-testid="checkbox">
        Checkbox: {checkbox.isChecked ? 'Checked' : 'Unchecked'}
      </div>
      <div data-testid="sidebar">
        Sidebar: {sidebar.isOpen ? 'Open' : 'Closed'}
      </div>
      <div data-testid="accordion">
        Accordion: {accordion.isExpanded ? 'Expanded' : 'Collapsed'}
      </div>

      <button onClick={() => show(modal)}>Show Modal</button>
      <button onClick={() => hide(modal)}>Hide Modal</button>
      <button onClick={() => toggle(modal)}>Toggle Modal</button>

      <button onClick={() => check(checkbox)}>Check Box</button>
      <button onClick={() => uncheck(checkbox)}>Uncheck Box</button>
      <button onClick={() => toggle(checkbox)}>Toggle Checkbox</button>

      <button onClick={() => open(sidebar)}>Open Sidebar</button>
      <button onClick={() => close(sidebar)}>Close Sidebar</button>
      <button onClick={() => toggle(sidebar)}>Toggle Sidebar</button>

      <button onClick={() => expand(accordion)}>Expand Accordion</button>
      <button onClick={() => collapse(accordion)}>Collapse Accordion</button>
      <button onClick={() => toggle(accordion)}>Toggle Accordion</button>
    </div>
  )
}

describe('useToggles hook', () => {
  it('creates nouns with correct initial state', () => {
    render(<TestComponent initialValues={[true, true, false, false]} />)

    expect(screen.getByTestId('modal').textContent).toContain('Open')
    expect(screen.getByTestId('checkbox').textContent).toContain('Checked')
    expect(screen.getByTestId('sidebar').textContent).toContain('Closed')
    expect(screen.getByTestId('accordion').textContent).toContain('Collapsed')
  })

  it('updates modal state via show/hide/toggle verbs', async () => {
    render(<TestComponent initialValues={[false, false, false, false]} />)
    const modalDisplay = screen.getByTestId('modal')
    expect(modalDisplay.textContent).toContain('Closed')

    // Show modal
    await userEvent.click(screen.getByText('Show Modal'))
    expect(modalDisplay.textContent).toContain('Open')

    // Toggle modal (should hide)
    await userEvent.click(screen.getByText('Toggle Modal'))
    expect(modalDisplay.textContent).toContain('Closed')

    // Toggle modal again (should show)
    await userEvent.click(screen.getByText('Toggle Modal'))
    expect(modalDisplay.textContent).toContain('Open')

    // Hide modal
    await userEvent.click(screen.getByText('Hide Modal'))
    expect(modalDisplay.textContent).toContain('Closed')
  })

  it('updates checkbox state via check/uncheck/toggle verbs', async () => {
    render(<TestComponent initialValues={[false, false, false, false]} />)
    const checkboxDisplay = screen.getByTestId('checkbox')
    expect(checkboxDisplay.textContent).toContain('Unchecked')

    // Check checkbox
    await userEvent.click(screen.getByText('Check Box'))
    expect(checkboxDisplay.textContent).toContain('Checked')

    // Toggle checkbox (should uncheck)
    await userEvent.click(screen.getByText('Toggle Checkbox'))
    expect(checkboxDisplay.textContent).toContain('Unchecked')

    // Toggle checkbox again (should check)
    await userEvent.click(screen.getByText('Toggle Checkbox'))
    expect(checkboxDisplay.textContent).toContain('Checked')

    // Uncheck checkbox
    await userEvent.click(screen.getByText('Uncheck Box'))
    expect(checkboxDisplay.textContent).toContain('Unchecked')
  })

  it('updates sidebar state via open/close/toggle verbs', async () => {
    render(<TestComponent initialValues={[false, false, false, false]} />)
    const sidebarDisplay = screen.getByTestId('sidebar')
    expect(sidebarDisplay.textContent).toContain('Closed')

    // Open sidebar
    await userEvent.click(screen.getByText('Open Sidebar'))
    expect(sidebarDisplay.textContent).toContain('Open')

    // Toggle sidebar (should close)
    await userEvent.click(screen.getByText('Toggle Sidebar'))
    expect(sidebarDisplay.textContent).toContain('Closed')

    // Close sidebar (should remain closed)
    await userEvent.click(screen.getByText('Close Sidebar'))
    expect(sidebarDisplay.textContent).toContain('Closed')
  })

  it('updates accordion state via expand/collapse/toggle verbs', async () => {
    render(<TestComponent initialValues={[false, false, false, false]} />)
    const accordionDisplay = screen.getByTestId('accordion')
    expect(accordionDisplay.textContent).toContain('Collapsed')

    // Expand accordion
    await userEvent.click(screen.getByText('Expand Accordion'))
    expect(accordionDisplay.textContent).toContain('Expanded')

    // Toggle accordion (should collapse)
    await userEvent.click(screen.getByText('Toggle Accordion'))
    expect(accordionDisplay.textContent).toContain('Collapsed')

    // Toggle accordion again (should expand)
    await userEvent.click(screen.getByText('Toggle Accordion'))
    expect(accordionDisplay.textContent).toContain('Expanded')

    // Collapse accordion
    await userEvent.click(screen.getByText('Collapse Accordion'))
    expect(accordionDisplay.textContent).toContain('Collapsed')
  })

  it('throws error when noun name conflicts with verb', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const TestComponent = () => {
      try {
        const { open } = useToggles()
        return <div>{open}</div>
      } catch (error) {
        return <div data-testid="error">{(error as Error).message}</div>
      }
    }

    render(<TestComponent />)
    expect(screen.getByTestId('error').textContent).toContain('Invalid noun name "open"')
    process.env.NODE_ENV = originalEnv
  })

  it('shares state with namespace between components', async () => {
    const EditorToolbarSettings = () => {
      const { spellCheck } = useToggles('editor-settings', true)
      return (
        <>
          <div data-testid="toolbar">{spellCheck?.isEnabled ? 'enabled' : 'disabled'}</div>
          <button onClick={() => toggle(spellCheck)}>Toggle Spell Check</button>
        </>
      )
    }

    const EditorTextarea = () => {
      const { spellCheck } = useToggles('editor-settings', true)
      return <div data-testid="textarea">{spellCheck?.isEnabled ? 'enabled' : 'disabled'}</div>
    }

    render(<><EditorToolbarSettings /><EditorTextarea /></>)

    expect(screen.getByTestId('toolbar').textContent).toBe('enabled')
    expect(screen.getByTestId('textarea').textContent).toBe('enabled')

    await userEvent.click(screen.getByText('Toggle Spell Check'))

    expect(screen.getByTestId('toolbar').textContent).toBe('disabled')
    expect(screen.getByTestId('textarea').textContent).toBe('disabled')
  })

  it('creates multiple nouns with proper initial states', () => {
    const TestComponent = () => {
      const { banner, microphone, premiumPlan } = useToggles(true, false, true)
      return (
        <>
          <div data-testid="banner">{banner.isShown ? 'shown' : 'hidden'}</div>
          <div data-testid="microphone">{microphone.isOn ? 'on' : 'off'}</div>
          <div data-testid="premiumPlan">{premiumPlan.isSubscribed ? 'subscribed' : 'unsubscribed'}</div>
        </>
      )
    }

    render(<TestComponent />)
    expect(screen.getByTestId('banner').textContent).toBe('shown')
    expect(screen.getByTestId('microphone').textContent).toBe('off')
    expect(screen.getByTestId('premiumPlan').textContent).toBe('subscribed')
  })

  it('maintains order with destructuring', () => {
    const TestComponent = () => {
      const { modal, drawer, sidebar } = useToggles(false, true, false)
      return (
        <>
          <div data-testid="modal">{modal.isOpen ? 'open' : 'closed'}</div>
          <div data-testid="drawer">{drawer.isOpen ? 'open' : 'closed'}</div>
          <div data-testid="sidebar">{sidebar.isOpen ? 'open' : 'closed'}</div>
        </>
      )
    }

    render(<TestComponent />)
    expect(screen.getByTestId('modal').textContent).toBe('closed')
    expect(screen.getByTestId('drawer').textContent).toBe('open')
    expect(screen.getByTestId('sidebar').textContent).toBe('closed')
  })

  it('updates state independently for multiple nouns', async () => {
    // Provide initial values: modal = true, checkbox = false, sidebar = false, accordion = true.
    render(<TestComponent initialValues={[true, false, false, true]} />)
    const modalDisplay = screen.getByTestId('modal')
    const checkboxDisplay = screen.getByTestId('checkbox')
    const sidebarDisplay = screen.getByTestId('sidebar')
    const accordionDisplay = screen.getByTestId('accordion')

    expect(modalDisplay.textContent).toContain('Open')
    expect(checkboxDisplay.textContent).toContain('Unchecked')
    expect(sidebarDisplay.textContent).toContain('Closed')
    expect(accordionDisplay.textContent).toContain('Expanded')

    // Change states:
    // - Hide modal (true -> false)
    // - Check checkbox (false -> true)
    // - Open sidebar (false -> true)
    // - Collapse accordion (true -> false)
    await userEvent.click(screen.getByText('Hide Modal'))
    await userEvent.click(screen.getByText('Check Box'))
    await userEvent.click(screen.getByText('Open Sidebar'))
    await userEvent.click(screen.getByText('Collapse Accordion'))

    expect(modalDisplay.textContent).toContain('Closed')
    expect(checkboxDisplay.textContent).toContain('Checked')
    expect(sidebarDisplay.textContent).toContain('Open')
    expect(accordionDisplay.textContent).toContain('Collapsed')
  })
})
