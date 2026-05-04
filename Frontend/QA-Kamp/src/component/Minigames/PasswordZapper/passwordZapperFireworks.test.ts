/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'
import initFireworks from './passwordZapperFireworks'

describe('passwordZapperFireworks', () => {
  let originalRaf: typeof window.requestAnimationFrame
  let originalCancel: typeof window.cancelAnimationFrame
  let rafQueue: Array<(ts: number) => void>

  beforeEach(() => {
    // reset globals and create a controlled raf queue
    originalRaf = window.requestAnimationFrame
    originalCancel = window.cancelAnimationFrame
    rafQueue = []
    // mock rAF to queue callbacks but not auto-run them
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafQueue.push(cb as (ts: number) => void)
      return rafQueue.length
    }
    window.cancelAnimationFrame = (id: number) => {
      // mark slot as no-op
      const idx = id - 1
      if (rafQueue[idx]) rafQueue[idx] = () => {}
    }
  })

  afterEach(() => {
    // restore mocked globals
    try { window.requestAnimationFrame = originalRaf } catch { /* ignore */ }
    try { window.cancelAnimationFrame = originalCancel } catch { /* ignore */ }
    try { delete (window as any).devicePixelRatio } catch { /* ignore */ }
  })

  it('resizes canvas based on bounding rect and devicePixelRatio and returns cleanup', () => {
    const dpr = 2;
    // mock devicePixelRatio in a way that avoids starting a line with '('
    Object.defineProperty(window, 'devicePixelRatio', { value: dpr, configurable: true })

    // prepare a fake 2D context with spies for drawing methods
    const ctx: any = {
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    }

    const canvasEl: any = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 150, height: 80 }),
    }

    const cleanup = initFireworks(canvasEl as HTMLCanvasElement)
    expect(typeof cleanup).toBe('function')

    // resize should have set canvas dimensions according to rect*dpr
    expect(canvasEl.width).toBe(Math.max(1, Math.floor(150 * dpr)))
    expect(canvasEl.height).toBe(Math.max(1, Math.floor(80 * dpr)))
    expect(canvasEl.style.width).toBe(`${Math.floor(150)}px`)
    expect(canvasEl.style.height).toBe(`${Math.floor(80)}px`)
    // ctx.setTransform should have been called to apply DPR
    expect((ctx.setTransform as any).mock.calls.length).toBeGreaterThanOrEqual(1)

    // cleanup should cancel raf and remove listeners without throwing
    // spy on removeEventListener
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    cleanup()
    expect(removeSpy).toHaveBeenCalled()
    removeSpy.mockRestore()
  })

  it('runs a few animation frames and draws rockets/bursts (ctx methods called) then cleans up', () => {
    const ctx: any = {
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    }

    const canvasEl: any = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 200, height: 120 }),
    }

    const cleanup = initFireworks(canvasEl as HTMLCanvasElement)

    // At this point one rAF callback should be queued
    expect(rafQueue.length).toBeGreaterThanOrEqual(1)

    // run several frames manually to let rockets/bursts be created and drawn
    for (let i = 0; i < 5; i++) {
      const cb = rafQueue.shift()
      if (cb) cb(i * 1000)
    }

    // As the loop draws, ctx.fillRect and arc/fill/stroke should have been called
    expect((ctx.fillRect as any).mock.calls.length).toBeGreaterThan(0)
    expect((ctx.beginPath as any).mock.calls.length).toBeGreaterThan(0)
    expect((ctx.arc as any).mock.calls.length).toBeGreaterThan(0)

    // cleanup should cancel the last scheduled raf (call cancelAnimationFrame)
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    cleanup()
    expect(cancelSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    cancelSpy.mockRestore()
    removeSpy.mockRestore()
  })
})

