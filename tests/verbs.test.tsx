import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToggle, useToggles, verbs, check, toggle, open, close } from '..'
import { nounState, positiveVerbs, negativeVerbs } from '../utils'

describe('Verbs', () => {
  describe('verb behavior', () => {
    // Test all positive verbs
    it.each(Object.entries(positiveVerbs))(
      '%s verb activates noun',
      async (verbName, verb) => {
        const TestComponent = () => {
          const popup = useToggle(false)
          return (
            <>
              <div data-testid="state">{popup.isOpen ? 'open' : 'closed'}</div>
              <button onClick={() => verb(popup)}>Test</button>
            </>
          )
        }

        render(<TestComponent />)
        expect(screen.getByTestId('state').textContent).toBe('closed')

        await userEvent.click(screen.getByText('Test'))
        await waitFor(() => {
          expect(screen.getByTestId('state').textContent).toBe('open')
        })
      }
    )

    // Test all negative verbs
    it.each(Object.entries(negativeVerbs))(
      '%s verb deactivates noun',
      async (verbName, verb) => {
        const TestComponent = () => {
          const checkbox = useToggle(true)
          return (
            <>
              <div data-testid="checkbox">{checkbox.isChecked ? 'checked' : 'unchecked'}</div>
              <button onClick={() => verb(checkbox)}>Test</button>
            </>
          )
        }

        render(<TestComponent />)
        expect(screen.getByTestId('checkbox').textContent).toBe('checked')

        await userEvent.click(screen.getByText('Test'))
        await waitFor(() => {
          expect(screen.getByTestId('checkbox').textContent).toBe('unchecked')
        })
      }
    )

    it('toggle verb inverts noun state', async () => {
      const PasswordInput = () => {
        const password = useToggle(false)
        return (
          <>
            <div data-testid="password">{password.isRevealed ? 'revealed' : 'concealed'}</div>
            <button onClick={() => toggle(password)}>Toggle</button>
          </>
        )
      }

      render(<PasswordInput />)
      expect(screen.getByTestId('password').textContent).toBe('concealed')

      await userEvent.click(screen.getByText('Toggle'))
      await waitFor(() => {
        expect(screen.getByTestId('password').textContent).toBe('revealed')
      })

      await userEvent.click(screen.getByText('Toggle'))
      await waitFor(() => {
        expect(screen.getByTestId('password').textContent).toBe('concealed')
      })
    })

    it('all noun state properties are booleans', () => {
      const TestComponent = () => {
        const noun = useToggle(false)

        // Verify all nounState properties are booleans
        React.useEffect(() => {
          Object.keys(nounState).forEach(key => expect(typeof (noun as any)[key]).toBe('boolean'))
        }, [noun])

        return <div>Test</div>
      }

      render(<TestComponent />)
    })
  })

  describe('verb imports and exports', () => {
    it('verbs can be imported individually', async () => {
      const SearchBar = () => {
        const searchBar = useToggle(false)
        return (
          <>
            <div data-testid="searchBar">{searchBar.isFocused ? 'focused' : 'blurred'}</div>
            <button onClick={() => open(searchBar)}>Open</button>
            <button onClick={() => check(searchBar)}>Check</button>
            <button onClick={() => close(searchBar)}>Close</button>
          </>
        )
      }

      render(<SearchBar />)
      expect(screen.getByTestId('searchBar').textContent).toBe('blurred')

      await userEvent.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('searchBar').textContent).toBe('focused')
      })

      await userEvent.click(screen.getByText('Close'))
      await waitFor(() => {
        expect(screen.getByTestId('searchBar').textContent).toBe('blurred')
      })
    })

    it('verbs from useToggles work with useToggle nouns', async () => {
      const Filter = () => {
        const filter = useToggle(false)
        return (
          <>
            <div data-testid="filter">{filter.isActive ? 'active' : 'inactive'}</div>
            <button onClick={() => verbs.activate(filter)}>Activate</button>
          </>
        )
      }

      render(<Filter />)
      expect(screen.getByTestId('filter').textContent).toBe('inactive')

      await userEvent.click(screen.getByText('Activate'))
      expect(screen.getByTestId('filter').textContent).toBe('active')
    })

    it('imported verbs work with useToggles nouns', async () => {
      const Notification = () => {
        const { notification } = useToggles(false)
        return (
          <>
            <div data-testid="notification">{notification.isVisible ? 'visible' : 'hidden'}</div>
            <button onClick={() => open(notification)}>Open</button>
            <button onClick={() => close(notification)}>Close</button>
          </>
        )
      }

      render(<Notification />)
      expect(screen.getByTestId('notification').textContent).toBe('hidden')

      await userEvent.click(screen.getByText('Open'))
      expect(screen.getByTestId('notification').textContent).toBe('visible')

      await userEvent.click(screen.getByText('Close'))
      expect(screen.getByTestId('notification').textContent).toBe('hidden')
    })
  })
})
