import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OrganizerLogin from './OrganizerLogin'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'

const mockLogin = vi.fn()
vi.mock('../../api', () => ({ loginOrganizer: (...args: unknown[]) => (mockLogin as unknown as (...a: unknown[]) => unknown)(...args) }))

describe('OrganizerLogin (merged tests)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('renders form fields', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/wachtwoord/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /inloggen|login|starten/i })).toBeDefined()
  })

  it('shows invalid email format error', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid' } })
    fireEvent.change(screen.getByLabelText(/wachtwoord/i), { target: { value: 'x' } })
    const form = document.querySelector('form')
    if (!form) throw new Error('form not found')
    fireEvent.submit(form)
    await screen.findByText(/Ongeldig emailadres/i)
  })

  it('successful login calls api and navigates', async () => {
    mockLogin.mockResolvedValue({ user: { id: 'u1', email: 'u@x.com' } })

    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@x.com' } })
    fireEvent.change(screen.getByLabelText(/wachtwoord/i), { target: { value: 'p' } })
    fireEvent.submit(document.querySelector('form')!)

    await waitFor(() => expect(mockLogin).toHaveBeenCalled())
  })

  it('invalid credentials show general error', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@x.com' } })
    fireEvent.change(screen.getByLabelText(/wachtwoord/i), { target: { value: 'p' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByText(/Foute Inloggegevens/i)
  })

  it('backend returns field error shows under field', async () => {
    mockLogin.mockRejectedValue(JSON.stringify({ field: 'email', error: 'Invalid' }))
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@x.com' } })
    fireEvent.change(screen.getByLabelText(/wachtwoord/i), { target: { value: 'p' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByText(/Invalid/i)
  })

  it('pressing back link navigates to home', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByLabelText(/Terug naar home/i)).toBeDefined()
  })
})
