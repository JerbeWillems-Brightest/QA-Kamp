import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ManagePlayers from './ManagePlayers'
import { AuthProvider } from '../../context/AuthContext'
import { SessionProvider } from '../../context/SessionContext'

// mock api
const mockFetchPlayers = vi.fn()
const mockAdd = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock('../../api', () => ({
  fetchPlayersForSession: (...args: unknown[]) => (mockFetchPlayers as unknown as (...a: unknown[]) => unknown)(...args),
  addPlayersToSession: (...args: unknown[]) => (mockAdd as unknown as (...a: unknown[]) => unknown)(...args),
  updatePlayerInSession: (...args: unknown[]) => (mockUpdate as unknown as (...a: unknown[]) => unknown)(...args),
  deletePlayerFromSession: (...args: unknown[]) => (mockDelete as unknown as (...a: unknown[]) => unknown)(...args),
}))

describe('ManagePlayers (merged tests)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('renders header and action buttons', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/Spelers beheren/i)).toBeDefined()
    // Buttons are rendered; when no players exist both 'Spelers importeren' and 'Spelers toevoegen' appear
    expect(screen.getByText(/Spelers toevoegen/i)).toBeDefined()
    expect(screen.getByText(/Spelers importeren/i)).toBeDefined()
  })

  it('shows message when no players and shows import button', () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/Klik op de knop om een Excel\/CSV-bestand te importeren/i)).toBeDefined()
    expect(screen.getByText(/Spelers importeren/i)).toBeDefined()
  })

  it('hides import button when players exist', async () => {
    const players = [{ playerNumber: '101', name: 'alice', age: 10 }]
    mockFetchPlayers.mockResolvedValue({ players })
    localStorage.setItem('currentSessionId', 's1')

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.queryByText(/Spelers importeren/i)).toBeNull())
    expect(screen.getByText(/Spelers toevoegen/i)).toBeDefined()
  })

  it('renders table rows for loaded players', async () => {
    const players = [{ playerNumber: '201', name: 'bob', age: 12, category: '11-13' }]
    mockFetchPlayers.mockResolvedValue({ players })
    localStorage.setItem('currentSessionId', 's2')

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/bob/i)).toBeDefined())
    expect(screen.getByText('201')).toBeDefined()
    expect(screen.getByText(/11-13/)).toBeDefined()
  })

  it('validation: adding player with invalid age shows error', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 's3')
    const mockFetchExisting = vi.fn().mockResolvedValue({ players: [] })
    // override api fetchPlayersForSession used inside submitPlayer validation
    mockFetchPlayers.mockImplementation(mockFetchExisting)

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Spelers toevoegen/i))
    const numInput = await screen.findByPlaceholderText(/001/)
    const nameInput = screen.getByPlaceholderText(/naam/i)
    // the UI now uses a category select; test validation for missing name instead
    const categoryInput = screen.getByLabelText(/Leeftijdscategorie/i)

    // leave name empty to trigger validation
    fireEvent.change(numInput, { target: { value: '123' } })
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.change(categoryInput, { target: { value: '8-10' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Naam is verplicht/i)).toBeDefined())
  })

  it('submitPlayer without session shows error', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Spelers toevoegen/i))
    const numInput2 = await screen.findByPlaceholderText(/001/)
    const nameInput2 = screen.getByPlaceholderText(/naam/i)
    const categorySelect2 = screen.getByLabelText(/Leeftijdscategorie/i)

    // leave session missing
    fireEvent.change(numInput2, { target: { value: '123' } })
    fireEvent.change(nameInput2, { target: { value: 'John' } })
    fireEvent.change(categorySelect2, { target: { value: '11-13' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Geen actieve sessie gevonden/i)).toBeDefined())
  })

  it('adding a player calls addPlayersToSession and shows success', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sadd')
    mockAdd.mockResolvedValue({ created: [{ playerNumber: '555', name: 'new', age: 9 }] })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Spelers toevoegen/i))
    const numInput3 = await screen.findByPlaceholderText(/001/)
    const nameInput3 = screen.getByPlaceholderText(/naam/i)
    const categorySelect3 = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(numInput3, { target: { value: '555' } })
    fireEvent.change(nameInput3, { target: { value: 'new' } })
    fireEvent.change(categorySelect3, { target: { value: '8-10' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Speler toegevoegd|Speler bijgewerkt/i)).toBeDefined())
  })

  it('edit flow: startEdit then submit updates via updatePlayerInSession', async () => {
    const players = [{ playerNumber: '777', name: 'editme', age: 11 }]
    mockFetchPlayers.mockResolvedValue({ players })
    localStorage.setItem('currentSessionId', 'sedit')
    mockUpdate.mockResolvedValue({ player: { playerNumber: '777', name: 'edited', age: 12 } })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/editme/i)).toBeDefined())
    fireEvent.click(screen.getAllByTitle(/Bewerk/i)[0])
    const nameEdit = await screen.findByPlaceholderText(/naam/i)

    fireEvent.change(nameEdit, { target: { value: 'edited' } })
    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Speler bijgewerkt/i)).toBeDefined())
  })

  it('delete player calls API and removes from list', async () => {
    const players = [{ playerNumber: '888', name: 'todelete', age: 13 }]
    mockFetchPlayers.mockResolvedValue({ players })
    localStorage.setItem('currentSessionId', 'sdel')
    mockDelete.mockResolvedValue({ success: true })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/todelete/i)).toBeDefined())
    fireEvent.click(screen.getAllByTitle(/Verwijder/i)[0])
    await waitFor(() => expect(mockDelete).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Speler verwijderd/i)).toBeDefined())
  })
})
