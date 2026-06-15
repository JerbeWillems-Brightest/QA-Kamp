import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import type { User } from './AuthContext'

function TestConsumer() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button onClick={() => login({ id: '1', email: 'a@b.com', name: 'Tester' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

// Hoofdsuite: AuthContext tests
// De tests controleren initialisatie, login/logout en foutafhandeling bij malformed localStorage
describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // Test: controleert dat de context standaard geen ingelogde gebruiker bevat
  // wanneer er niets in localStorage staat.
  it('defaults to null user when nothing in localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  // Test: als er een user-object in localStorage staat, wordt deze
  // bij initialisatie van de provider geladen in de context.
  it('loads initial user from localStorage', () => {
    const u: User = { id: '42', email: 'load@me', name: 'Loaded' }
    localStorage.setItem('user', JSON.stringify(u))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const displayed = screen.getByTestId('user').textContent || ''
    expect(displayed).toContain('load@me')
    expect(JSON.parse(displayed)).toMatchObject({ id: '42', email: 'load@me' })
  })

  // Test: wanneer login() wordt aangeroepen via useAuth, wordt de context
  // bijgewerkt en wordt de gebruiker ook in localStorage opgeslagen.
  it('login() updates context and localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const loginBtn = screen.getByRole('button', { name: /login/i })
    fireEvent.click(loginBtn)

    const displayed = screen.getByTestId('user').textContent || ''
    expect(displayed).toContain('a@b.com')
    const stored = localStorage.getItem('user')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toMatchObject({ email: 'a@b.com', id: '1' })
  })

  // Test: wanneer logout() wordt aangeroepen, wordt de context geleegd
  // en wordt de opgeslagen user uit localStorage verwijderd.
  it('logout() clears context and localStorage', () => {
    // seed localStorage and render
    localStorage.setItem('user', JSON.stringify({ id: '9', email: 'bye@me', name: 'Bye' }))
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // ensure initial loaded
    expect(screen.getByTestId('user').textContent).toContain('bye@me')

    const logoutBtn = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(logoutBtn)

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(localStorage.getItem('user')).toBeNull()
  })

  // Test: als localStorage iets bevat wat geen geldige JSON is,
  // moet de provider niet crashen en defaulten naar null.
  it('handles malformed localStorage JSON gracefully', () => {
    localStorage.setItem('user', '{ this is : not json')

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // should fallback to null user rather than throwing, and the provider
    // effect will remove the malformed item from localStorage.
    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(localStorage.getItem('user')).toBeNull()
  })

  // Test: multiple login-aanroepen overschrijven de huidige user
  it('multiple login() calls update context and localStorage to the latest user', () => {
    function TwoLoginConsumer() {
      const { user, login } = useAuth()
      return (
        <div>
          <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
          <button onClick={() => login({ id: '1', email: 'first@me', name: 'First' })}>login first</button>
          <button onClick={() => login({ id: '2', email: 'second@me', name: 'Second' })}>login second</button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TwoLoginConsumer />
      </AuthProvider>
    )

    const firstBtn = screen.getByRole('button', { name: /login first/i })
    const secondBtn = screen.getByRole('button', { name: /login second/i })

    fireEvent.click(firstBtn)
    expect(screen.getByTestId('user').textContent).toContain('first@me')
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({ id: '1', email: 'first@me' })

    fireEvent.click(secondBtn)
    expect(screen.getByTestId('user').textContent).toContain('second@me')
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({ id: '2', email: 'second@me' })
  })

  // Test: logout oproepen als er geen ingelogde user is mag geen fout geven
  it('logout() is a no-op when there is no user', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // ensure initially null
    expect(screen.getByTestId('user').textContent).toBe('null')

    const logoutBtn = screen.getByRole('button', { name: /logout/i })
    // should not throw
    fireEvent.click(logoutBtn)

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(localStorage.getItem('user')).toBeNull()
  })

  // Test: controleert dat useAuth een fout gooit als het buiten
  // een AuthProvider wordt gebruikt (protectie tegen verkeerd gebruik).
  it('useAuth throws when used outside of provider', () => {
    // create a component that calls useAuth during render
    function Bad() {
      // call useAuth directly to trigger the error; avoid unused variable
      useAuth()
      return <div />
    }

    expect(() => render(<Bad />)).toThrow(/useAuth must be used within AuthProvider/)
  })
})
