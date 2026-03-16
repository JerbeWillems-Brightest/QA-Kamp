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

  it('valid name with only letters is accepted', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'valid-session')
    mockAdd.mockResolvedValue({ created: [{ playerNumber: '101', name: 'anna', age: 11 }] })

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(num, { target: { value: '101' } })
    fireEvent.change(name, { target: { value: 'Anna' } })
    fireEvent.change(category, { target: { value: '11-13' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))

    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Speler toegevoegd|Speler bijgewerkt/i)).toBeDefined())
  })

  it('invalid name with spaces is rejected', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-spaces')

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(num, { target: { value: '102' } })
    fireEvent.change(name, { target: { value: 'John Doe' } })
    fireEvent.change(category, { target: { value: '8-10' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Naam mag geen spaties bevatten/i)).toBeDefined())
  })

  it('invalid name longer than 25 chars is rejected', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-long')

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    const longName = 'a'.repeat(26)
    fireEvent.change(num, { target: { value: '103' } })
    fireEvent.change(name, { target: { value: longName } })
    fireEvent.change(category, { target: { value: '11-13' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Naam mag maximaal 25 tekens bevatten/i)).toBeDefined())
  })

  it('invalid name with numeric characters is rejected', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-num')

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(num, { target: { value: '104' } })
    fireEvent.change(name, { target: { value: 'John1' } })
    fireEvent.change(category, { target: { value: '8-10' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Naam mag geen cijfers bevatten/i)).toBeDefined())
  })

  it('invalid name with special characters is rejected', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-special')

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(num, { target: { value: '105' } })
    fireEvent.change(name, { target: { value: 'J@hn' } })
    fireEvent.change(category, { target: { value: '11-13' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Geen speciale tekens toegestaan in naam/i)).toBeDefined())
  })

  it('invalid empty category is rejected', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-cat')

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(num, { target: { value: '106' } })
    fireEvent.change(name, { target: { value: 'Lotte' } })
    // set category to empty string to simulate invalid selection
    fireEvent.change(category, { target: { value: '' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    await waitFor(() => expect(screen.getByText(/Ongeldige leeftijdscategorie/i)).toBeDefined())
  })

  it('accepts name with 24 letters and valid category', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-24')
    mockAdd.mockResolvedValue({ created: [{ playerNumber: '120', name: 'a'.repeat(24), age: 11 }] })

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(num, { target: { value: '120' } })
    fireEvent.change(name, { target: { value: 'a'.repeat(24) } })
    fireEvent.change(category, { target: { value: '11-13' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))

    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Speler toegevoegd|Speler bijgewerkt/i)).toBeDefined())
  })

  it('rejects name >25 chars when category is empty', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sess-26-emptycat')

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
    const num = await screen.findByPlaceholderText(/001/)
    const name = screen.getByPlaceholderText(/naam/i)
    const category = screen.getByLabelText(/Leeftijdscategorie/i)

    const longName = 'b'.repeat(26)
    fireEvent.change(num, { target: { value: '126' } })
    fireEvent.change(name, { target: { value: longName } })
    // simulate empty category
    fireEvent.change(category, { target: { value: '' } })

    fireEvent.click(screen.getByText(/Opslaan|Bijwerken/i))
    // Validation checks name length before category, so expect name-length error
    await waitFor(() => expect(screen.getByText(/Naam mag maximaal 25 tekens bevatten/i)).toBeDefined())
  })

  it('renders close (X) button when onClose prop provided', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers onClose={() => {}} />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/Sluit/i)).toBeDefined()
  })

  it('shows delete button next to a player in the table', async () => {
    const players = [{ playerNumber: '999', name: 'delme', age: 10 }]
    mockFetchPlayers.mockResolvedValue({ players })
    localStorage.setItem('currentSessionId', 'sdel-presence')

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <ManagePlayers />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/delme/i)).toBeDefined())
    // there should be a delete button titled 'Verwijder' next to the row
    expect(screen.getAllByTitle(/Verwijder/i)[0]).toBeDefined()
  })

  it('name and category fields are editable in the add form', async () => {
    mockFetchPlayers.mockResolvedValue({ players: [] })
    localStorage.setItem('currentSessionId', 'sedit-presence')

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
    const nameInput = await screen.findByPlaceholderText(/naam/i)
    const categorySelect = screen.getByLabelText(/Leeftijdscategorie/i)

    fireEvent.change(nameInput, { target: { value: 'TestName' } })
    expect((nameInput as HTMLInputElement).value).toBe('TestName')

    fireEvent.change(categorySelect, { target: { value: '14-16' } })
    expect((categorySelect as HTMLSelectElement).value).toBe('14-16')
  })
})
