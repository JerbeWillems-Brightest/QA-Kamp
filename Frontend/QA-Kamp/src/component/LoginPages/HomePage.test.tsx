import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from './HomePage'
import * as api from '../../api'
import { BrowserRouter } from 'react-router-dom'

describe('HomePage (merged tests)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders input and play button', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )

    expect(screen.getByPlaceholderText(/Voer spelersnummer in/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Speel mee/i })).toBeDefined()
    expect(screen.getByText(/Log hier in als organisator/i)).toBeDefined()
  })

  it('rejects non-digit input (shows format error)', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(screen.getByText(/Geen letters of speciale tekens toegestaan/i)).toBeDefined()
  })

  it('accepts digits only and truncates to 3', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '123abc' } })
    expect((input as HTMLInputElement).value).toBe('123')
  })

  it('submitting empty shows error and does not alert', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { container } = render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const form = container.querySelector('form') as HTMLFormElement
    if (!form) throw new Error('form not found')
    fireEvent.submit(form)
    await screen.findByText(/Vul je spelersnummer in/i)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('unique spelersnummer is accepted (stores player in sessionStorage and navigates waiting)', async () => {
    // mock an active session and API response
    localStorage.setItem('currentSessionId', 'sess-1')
    const fetchMock = vi.spyOn(api, 'fetchPlayersForSession').mockResolvedValue({ players: [{ playerNumber: '123', name: 'Test', age: 12, category: '11-13' }] })

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /Speel mee/i }))

    // wait for async navigation side-effects
    await screen.findByRole('button', { name: /Speel mee/i })

    expect(sessionStorage.getItem('playerNumber')).toBe('123')
    expect(sessionStorage.getItem('playerSessionId')).toBe('sess-1')

    fetchMock.mockRestore()
  })

  it('more than 3 digits is not ok (shows error and blocks submit)', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    // typing more than 3 digits
    fireEvent.change(input, { target: { value: '1234' } })
    // input should be truncated, but an error should be shown and submit blocked
    expect((input as HTMLInputElement).value).toBe('123')
    expect(screen.getByText(/Maximaal 3 cijfers toegestaan/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Speel mee/i }))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('less than 3 digits is not ok (shows error and blocks submit)', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /Speel mee/i }))
    await screen.findByText(/Spelersnummer moet uit precies 3 cijfers bestaan/i)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('already used spelersnummer is not ok (shows error and blocks submit)', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    // mark '321' as already used
    localStorage.setItem('onlinePlayers', JSON.stringify(['321']))

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '321' } })
    fireEvent.click(screen.getByRole('button', { name: /Speel mee/i }))
    await screen.findByText(/Dit spelersnummer is al in gebruik/i)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('letters or special chars used => spelersnummer not ok (blocks submit)', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '1a2!' } })
    expect(screen.getByText(/Geen letters of speciale tekens toegestaan/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Speel mee/i }))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('rocket img exists and attributes present', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    expect(screen.getByAltText(/Rocket/i)).toBeDefined()
    expect((input as HTMLInputElement).getAttribute('inputmode')).toBe('numeric')
    expect((input as HTMLInputElement).getAttribute('pattern')).toBe('\\d*')
  })
})
