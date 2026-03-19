import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './index'

let mockedFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedFetch = vi.fn()
  vi.stubGlobal('fetch', mockedFetch)
})

describe('api functions', () => {
  it('loginOrganizer handles success', async () => {
    const mockResp = { message: 'Succesvol ingelogd', user: { id: '1', email: 'a@b.c' } }
    mockedFetch.mockResolvedValue({ ok: true, json: async () => mockResp })
    const res = await api.loginOrganizer('a@b.c', 'pw')
    expect(res.message).toBe('Succesvol ingelogd')
    expect(res.user).toBeDefined()
  })

  it('loginOrganizer throws on error', async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Invalid credentials' }) })
    await expect(api.loginOrganizer('x', 'y')).rejects.toThrow()
  })
})
