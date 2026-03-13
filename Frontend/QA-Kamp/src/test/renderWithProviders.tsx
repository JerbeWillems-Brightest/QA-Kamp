import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { SessionProvider } from '../context/SessionContext'

export function render(ui: React.ReactElement, { route = '/', ...options } = {}) {
  return rtlRender(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <SessionProvider>{ui}</SessionProvider>
      </AuthProvider>
    </MemoryRouter>,
    options
  )
}

// re-export helpers directly to avoid `export *` and avoid unused local bindings
export { screen, fireEvent, within, waitFor, act, prettyDOM, cleanup, getByText, findByText, getByRole, findByRole } from '@testing-library/react'
