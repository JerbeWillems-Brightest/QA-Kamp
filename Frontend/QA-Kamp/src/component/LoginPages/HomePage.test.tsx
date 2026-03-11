import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from './HomePage'
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

  it('rejects non-digit input', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(screen.getByText(/Alleen cijfers zijn toegestaan/i)).toBeDefined()
  })

  it('accepts digits only', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '123abc' } })
    expect((input as HTMLInputElement).value).toBe('123')
  })

  it('submitting empty shows error', async () => {
    const { container } = render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const form = container.querySelector('form') as HTMLFormElement
    if (!form) throw new Error('form not found')
    fireEvent.submit(form)
    await screen.findByText(/Vul je spelersnummer in/i)
  })

  it('submit shows alert with number', () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const input = screen.getByPlaceholderText(/Voer spelersnummer in/i)
    fireEvent.change(input, { target: { value: '321' } })
    fireEvent.click(screen.getByRole('button', { name: /Speel mee/i }))
    expect(spy).toHaveBeenCalledWith('Spelersnummer: 321')
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
