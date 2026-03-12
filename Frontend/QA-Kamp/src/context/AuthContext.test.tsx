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

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to null user when nothing in localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('null')
  })

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
