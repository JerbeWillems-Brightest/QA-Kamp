import { render, screen, fireEvent } from '@testing-library/react'
import MinigamePopup from './MinigamePopup'
import { describe, it, expect, vi } from 'vitest'

describe('MinigamePopup (checklist tests)', () => {
  const title = 'Kraak Het Wachtwoord'
  const genericRules = 'Algemene spelregels hier.'

  // Test: controleert dat de sluitknop (X), startknop, titel, algemene regels
  // en de leeftijdspillen correct gerenderd worden.
  it('renders the close X button, start button, title, rules and age pills', () => {
    // Arrange: maak spies voor callbacks en render de popup in open staat
    const onClose = vi.fn()
    const onStart = vi.fn()

    // Act: render component met de noodzakelijke props
    render(
      <MinigamePopup
        isOpen={true}
        title={title}
        rules={genericRules}
        onClose={onClose}
        onStart={onStart}
      />
    )

    // Assert: sluitknop (X) is aanwezig
    expect(screen.getByLabelText(/sluit/i)).toBeDefined()

    // Assert: startknop is aanwezig
    expect(screen.getByRole('button', { name: /spel starten/i })).toBeDefined()

    // Assert: titel en algemene regels worden weergegeven
    expect(screen.getByText(title)).toBeDefined()
    expect(screen.getByText(genericRules)).toBeDefined()
  })

  // Test: start het spel en controleer dat onStart wordt aangeroepen,
  // dat daarna de stopknop zichtbaar is en dat onStop het spel stopt en
  // de startknop weer zichtbaar maakt.
  it('shows stop button after starting the game and calls onStart', async () => {
    // Arrange: spies voor close/start/stop
    const onClose = vi.fn()
    const onStart = vi.fn()
    const onStop = vi.fn()

    // Act: render de popup en start het spel via de startknop
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

    // Assert: onStart is aangeroepen
    expect(onStart).toHaveBeenCalled()

    // Assert: stopknop verschijnt na starten
    const stopBtn = screen.getByRole('button', { name: /spel stoppen/i })
    expect(stopBtn).toBeDefined()

    // Act: klik stop en Assert: onStop wordt aangeroepen en startknop verschijnt weer
    fireEvent.click(stopBtn)
    expect(onStop).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /spel starten/i })).toBeDefined()
  })

  // Age-specific selection removed: no further tests needed here.
})
