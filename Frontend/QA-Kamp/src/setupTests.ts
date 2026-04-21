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

