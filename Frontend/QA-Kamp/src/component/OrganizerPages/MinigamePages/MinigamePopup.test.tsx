import { render, screen, fireEvent } from '@testing-library/react'
import MinigamePopup from './MinigamePopup'
import { describe, it, expect, vi } from 'vitest'

describe('MinigamePopup (checklist tests)', () => {
  const title = 'Kraak Het Wachtwoord'
  const genericRules = 'Algemene spelregels hier.'
  // make ages a const tuple so indexing preserves literal types
  const ages = ['8-10 jaar', '11-13 jaar', '14-16 jaar'] as const
  // type ageDescriptions so indexing by ages[...] is allowed
  const ageDescriptions: Record<(typeof ages)[number], string> = {
    '8-10 jaar': 'Regels voor 8-10',
    '11-13 jaar': 'Regels voor 11-13',
    '14-16 jaar': 'Regels voor 14-16',
  }

  it('renders the close X button, start button, title, rules and age pills', () => {
    const onClose = vi.fn()
    const onStart = vi.fn()

    render(
      <MinigamePopup
        isOpen={true}
        title={title}
        rules={genericRules}
        ages={[...ages]}
        ageDescriptions={ageDescriptions}
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
    expect(screen.getByText(/regels voor/i) || screen.getByText(genericRules)).toBeDefined()

    // Age pills
    ages.forEach(a => expect(screen.getByRole('button', { name: a })).toBeDefined())
  })

  it('shows stop button after starting the game and calls onStart', async () => {
    const onClose = vi.fn()
    const onStart = vi.fn()
    const onStop = vi.fn()

    render(
      <MinigamePopup
        isOpen={true}
        title={title}
        rules={genericRules}
        ages={[...ages]}
        ageDescriptions={ageDescriptions}
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

  it('shows the correct age-specific rules when selecting an age', () => {
    const onClose = vi.fn()
    const onSelectAge = vi.fn()

    render(
      <MinigamePopup
        isOpen={true}
        title={title}
        rules={genericRules}
        ages={[...ages]}
        ageDescriptions={ageDescriptions}
        initialAge={ages[0]}
        onClose={onClose}
        onSelectAge={onSelectAge}
      />
    )

    // Initial age-specific rules displayed
    expect(screen.getByText(ageDescriptions[ages[0]])).toBeDefined()

    // Select another age
    const secondAgeBtn = screen.getByRole('button', { name: ages[1] })
    fireEvent.click(secondAgeBtn)
    expect(onSelectAge).toHaveBeenCalledWith(ages[1])

    // The displayed rules should update
    expect(screen.getByText(ageDescriptions[ages[1]])).toBeDefined()
  })
})
