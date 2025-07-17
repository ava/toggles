import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToggle, verbs } from '../index'
import { nounState } from '../utils'

describe('useToggle hook', () => {
  beforeEach(() => {
    const { globalNouns } = require('../src/globalNouns')
    globalNouns.clear()
  })

  it('creates a single noun with initial state', () => {
    const Flashlight = () => {
      const flashlight = useToggle(true)
      return <div data-testid="state">{flashlight.isOn ? 'on' : 'off'}</div>
    }

    render(<Flashlight />)
    expect(screen.getByTestId('state').textContent).toBe('on')
  })

  it('works with verbs and triggers re-renders', async () => {
    let renderCount = 0

    const CountdownTimer = () => {
      renderCount++
      const countdownTimer = useToggle(false)
      return (
        <>
          <div data-testid="renders">{renderCount}</div>
          <div data-testid="state">{countdownTimer.hasStarted ? 'started' : 'not started'}</div>
          <button onClick={() => verbs.toggle(countdownTimer)}>Toggle</button>
          <button onClick={() => verbs.start(countdownTimer)}>Start</button>
        </>
      )
    }

    render(<CountdownTimer />)
    expect(screen.getByTestId('state').textContent).toBe('not started')
    expect(screen.getByTestId('renders').textContent).toBe('1')

    await userEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('state').textContent).toBe('started')
    expect(screen.getByTestId('renders').textContent).toBe('2')

    await userEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('state').textContent).toBe('not started')

    await userEvent.click(screen.getByText('Start'))
    expect(screen.getByTestId('state').textContent).toBe('started')
  })

  it('has all expected noun properties', () => {
    let noun: any

    const TestComponent = () => {
      noun = useToggle(false)
      return null
    }

    render(<TestComponent />)

    // Test a sample of properties rather than listing them all
    Object.keys(nounState).forEach(key => {
      expect(typeof noun[key]).toBe('boolean')
    })
  })

  it('creates unique instances for multiple useToggle calls', () => {
    let toggle1: any, toggle2: any

    const TestComponent = () => {
      toggle1 = useToggle(true)
      toggle2 = useToggle(false)
      return (
        <>
          <div data-testid="toggle1">{toggle1.isActive ? 'active' : 'inactive'}</div>
          <div data-testid="toggle2">{toggle2.isActive ? 'active' : 'inactive'}</div>
        </>
      )
    }

    render(<TestComponent />)

    // Should have different initial states
    expect(screen.getByTestId('toggle1').textContent).toBe('active')
    expect(screen.getByTestId('toggle2').textContent).toBe('inactive')

    // Should be different instances
    expect(toggle1).not.toBe(toggle2)
    expect(toggle1.name).not.toBe(toggle2.name)
  })

  it('works with all verb functions', async () => {
    const TestComponent = () => {
      const notification = useToggle(false)
      return (
        <>
          <div data-testid="state">{notification.isVisible ? 'visible' : 'hidden'}</div>
          <button onClick={() => verbs.show(notification)}>Show</button>
          <button onClick={() => verbs.hide(notification)}>Hide</button>
          <button onClick={() => verbs.toggle(notification)}>Toggle</button>
        </>
      )
    }

    render(<TestComponent />)
    expect(screen.getByTestId('state').textContent).toBe('hidden')

    await userEvent.click(screen.getByText('Show'))
    expect(screen.getByTestId('state').textContent).toBe('visible')

    await userEvent.click(screen.getByText('Hide'))
    expect(screen.getByTestId('state').textContent).toBe('hidden')

    await userEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('state').textContent).toBe('visible')
  })
}) 
