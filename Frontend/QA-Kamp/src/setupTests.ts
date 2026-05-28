// setup for testing-library and jsdom
import '@testing-library/jest-dom'

// optional: mock matchMedia if used
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom doesn't implement HTMLMediaElement.play/pause; provide harmless mocks
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(HTMLMediaElement.prototype as any).play = function () { return Promise.resolve() }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(HTMLMediaElement.prototype as any).pause = function () { /* no-op */ }
} catch {
  // ignore if environment doesn't allow modification
}

// Guard: ensure a stable `window` object and window.setTimeout reference
// Some components call `window.setTimeout(...)` and may schedule callbacks
// that run after a test file teardown; if `window` is removed this will
// throw ReferenceError: window is not defined. Provide a safe fallback so
// scheduled callbacks can still access a `window.setTimeout` that uses
// the global timer implementations.
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = globalThis
  }

  // Ensure window.setTimeout exists and delegates to the platform setTimeout
  // Use defineProperty so we don't accidentally shadow a real jsdom implementation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (globalThis as any).window
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (w as any).setTimeout !== 'function') {
    Object.defineProperty(w, 'setTimeout', {
      value: setTimeout.bind(globalThis),
      writable: true,
      configurable: true,
      enumerable: false,
    })
  }
} catch {
  // best-effort only for test environment stability
}

