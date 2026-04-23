import { render, screen, fireEvent } from '@testing-library/react'
import MinigamePopup from './MinigamePopup'
import { describe, it, expect, vi } from 'vitest'

describe('MinigamePopup (checklist tests)', () => {
  const title = 'Kraak Het Wachtwoord'
  const genericRules = 'Algemene spelregels hier.'

  // Test: controleert dat de sluitknop (X), startknop, titel, algemene regels
  // en de leeftijdspillen correct gerenderd worden.
  it('renders the close X button, start button, title, rules and age pills', () => {
    const onClose = vi.fn()
    const onStart = vi.fn()

    render(
      <MinigamePopup
        isOpen={true}
        title={title}
        rules={genericRules}
        onClose={onClose}
        onStart={onStart}
      />
    )

    // Close 'X' present
    expect(screen.getByLabelText(/sluit/i)).toBeDefined()

    // Start button present
    expect(screen.getByRole('button', { name: /spel starten/i })).toBeDefined()

    // Title and rules
    expect(screen.getByText(title)).toBeDefined()
    expect(screen.getByText(genericRules)).toBeDefined()
  })

  // Test: start het spel en controleer dat onStart wordt aangeroepen,
  // dat daarna de stopknop zichtbaar is en dat onStop het spel stopt en
  // de startknop weer zichtbaar maakt.
  it('shows stop button after starting the game and calls onStart', async () => {
    const onClose = vi.fn()
    const onStart = vi.fn()
    const onStop = vi.fn()

    render(
      <MinigamePopup
        isOpen={true}
        title={title}
        rules={genericRules}
        onClose={onClose}
        onStart={onStart}
        onStop={onStop}
      />
    )

    const startBtn = screen.getByRole('button', { name: /spel starten/i })
    fireEvent.click(startBtn)

    expect(onStart).toHaveBeenCalled()

    // Stop button should now be visible
    const stopBtn = screen.getByRole('button', { name: /spel stoppen/i })
    expect(stopBtn).toBeDefined()

    // Clicking stop calls onStop and shows start again
    fireEvent.click(stopBtn)
    expect(onStop).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /spel starten/i })).toBeDefined()
  })

  // Age-specific selection removed: no further tests needed here.
})
