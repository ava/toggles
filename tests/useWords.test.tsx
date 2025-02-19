import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import useWords from '..'

/**
 * TestComponent wraps useWords and renders three nouns:
 * - checkbox1 (with its "isActive" / "isChecked" state)
 * - darkMode (with its "isOn" state)
 * - modal (with its "isVisible" state)
 * 
 * It also renders buttons that trigger verb functions:
 * - check/toggle for checkbox1
 * - turnOn/turnOff for darkMode
 * - open/close/toggle for modal
 */
function TestComponent({ initialValues = [false, false, false] }: { initialValues?: boolean[] }) {
  const [nouns, verbs] = useWords(...initialValues)
  // Destructure a few nouns for testing:
  const { checkbox1, darkMode, modal } = nouns
  return (
    <div>
      <div data-testid="checkbox">
        Checkbox: {checkbox1.isChecked ? 'Checked' : 'Unchecked'}
      </div>
      <div data-testid="darkMode">
        Dark Mode: {darkMode.isOn ? 'On' : 'Off'}
      </div>
      <div data-testid="modal">
        Modal: {modal.isVisible ? 'Visible' : 'Hidden'}
      </div>

      <button onClick={() => verbs.check(checkbox1)}>Check Checkbox</button>
      <button onClick={() => verbs.toggle(checkbox1)}>Toggle Checkbox</button>

      <button onClick={() => verbs.turnOn(darkMode)}>Turn On Dark Mode</button>
      <button onClick={() => verbs.turnOff(darkMode)}>Turn Off Dark Mode</button>
      <button onClick={() => verbs.toggle(darkMode)}>Toggle Dark Mode</button>

      <button onClick={() => verbs.open(modal)}>Open Modal</button>
      <button onClick={() => verbs.close(modal)}>Close Modal</button>
      <button onClick={() => verbs.toggle(modal)}>Toggle Modal</button>
    </div>
  )
}

describe('useWords hook', () => {
  it('creates nouns with correct initial state', () => {
    // Provide initial values: checkbox1 = true, darkMode = false, modal = false.
    render(<TestComponent initialValues={[true, false, false]} />)

    expect(screen.getByTestId('checkbox').textContent).toContain('Checked')
    expect(screen.getByTestId('darkMode').textContent).toContain('Off')
    expect(screen.getByTestId('modal').textContent).toContain('Hidden')
  })

  it('updates noun state via open/close/toggle verbs for modal', async () => {
    render(<TestComponent initialValues={[false, false, false]} />)
    const modalDisplay = screen.getByTestId('modal')
    expect(modalDisplay.textContent).toContain('Hidden')

    // Click "Open Modal" and expect modal to become visible.
    await userEvent.click(screen.getByRole('button', { name: /open modal/i }))
    expect(modalDisplay.textContent).toContain('Visible')

    // Click "Toggle Modal" to switch from visible to hidden.
    await userEvent.click(screen.getByRole('button', { name: /toggle modal/i }))
    expect(modalDisplay.textContent).toContain('Hidden')

    // Click "Close Modal" (should remain hidden).
    await userEvent.click(screen.getByRole('button', { name: /close modal/i }))
    expect(modalDisplay.textContent).toContain('Hidden')
  })

  it('updates noun state via turnOn/turnOff/toggle verbs for darkMode', async () => {
    render(<TestComponent initialValues={[false, false, false]} />)
    const darkModeDisplay = screen.getByTestId('darkMode')
    expect(darkModeDisplay.textContent).toContain('Off')

    // Turn on dark mode.
    await userEvent.click(screen.getByRole('button', { name: /turn on dark mode/i }))
    expect(darkModeDisplay.textContent).toContain('On')

    // Toggle dark mode (should switch to Off).
    await userEvent.click(screen.getByRole('button', { name: /toggle dark mode/i }))
    expect(darkModeDisplay.textContent).toContain('Off')

    // Turn off dark mode (should remain Off).
    await userEvent.click(screen.getByRole('button', { name: /turn off dark mode/i }))
    expect(darkModeDisplay.textContent).toContain('Off')
  })

  it('updates noun state via check/toggle verbs for checkbox', async () => {
    render(<TestComponent initialValues={[false, false, false]} />)
    const checkboxDisplay = screen.getByTestId('checkbox')
    expect(checkboxDisplay.textContent).toContain('Unchecked')

    // Check the checkbox.
    await userEvent.click(screen.getByRole('button', { name: /check checkbox/i }))
    expect(checkboxDisplay.textContent).toContain('Checked')

    // Toggle the checkbox (should become unchecked).
    await userEvent.click(screen.getByRole('button', { name: /toggle checkbox/i }))
    expect(checkboxDisplay.textContent).toContain('Unchecked')
  })

  it('updates state independently for multiple nouns', async () => {
    // Provide initial values: checkbox1 = true, darkMode = false, modal = false.
    render(<TestComponent initialValues={[true, false, false]} />)
    const checkboxDisplay = screen.getByTestId('checkbox')
    const darkModeDisplay = screen.getByTestId('darkMode')
    const modalDisplay = screen.getByTestId('modal')

    expect(checkboxDisplay.textContent).toContain('Checked')
    expect(darkModeDisplay.textContent).toContain('Off')
    expect(modalDisplay.textContent).toContain('Hidden')

    // Change states:
    // - Toggle checkbox1 (true -> false)
    // - Turn on darkMode (false -> true)
    // - Open modal (false -> true)
    await userEvent.click(screen.getByRole('button', { name: /toggle checkbox/i }))
    await userEvent.click(screen.getByRole('button', { name: /turn on dark mode/i }))
    await userEvent.click(screen.getByRole('button', { name: /open modal/i }))

    expect(checkboxDisplay.textContent).toContain('Unchecked')
    expect(darkModeDisplay.textContent).toContain('On')
    expect(modalDisplay.textContent).toContain('Visible')
  })
})