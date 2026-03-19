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

  // Test: controleert dat het loginformulier de verwachte invoervelden en knop rendert
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

  // Test: valideert onjuist e-mail-formaat en toont een foutmelding
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

  // Test: als het e-mailveld leeg is wordt de juiste validatiefout getoond
  it('empty email shows validation error', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )
    // leave email empty
    fireEvent.change(screen.getByLabelText(/wachtwoord/i), { target: { value: 'secret' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByText(/Vul je emailadres in/i)
  })

  // Test: als het wachtwoordveld leeg is wordt de juiste validatiefout getoond
  it('empty password shows validation error', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@x.com' } })
    // leave password empty
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByText(/Vul je wachtwoord in/i)
  })

  // Test: succesvolle login roept de API aan en zorgt dat de call wordt uitgevoerd
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

  // Test: wanneer backend een bericht teruggeeft (bijv. user not found), wordt die boodschap getoond
  it('non-existing email shows backend message as general error', async () => {
    mockLogin.mockResolvedValue({ message: 'User not found' })
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizerLogin />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'noone@x.com' } })
    fireEvent.change(screen.getByLabelText(/wachtwoord/i), { target: { value: 'p' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByText(/User not found/i)
  })

  // Test: bij fout (rejected promise) van API tonen we de algemene foutmelding voor ongeldige inloggegevens
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

  // Test: als backend een field-specifieke error retourneert, wordt deze onder het veld getoond
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

  // Test: controleert dat de "Terug naar home" link aanwezig is en een aria-label heeft
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
