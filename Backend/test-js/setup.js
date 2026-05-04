// Polyfill globalThis.crypto.getRandomValues for test environment where "crypto" may be undefined
// mongodb (used by mongoose) expects a Web Crypto-style API for uuid generation.
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues !== 'function') {
  try {
    // Use Node's crypto module to implement getRandomValues
    const nodeCrypto = require('crypto')
    globalThis.crypto = {
      getRandomValues: function (buf) {
        if (!(buf instanceof Uint8Array)) {
          throw new TypeError('Expected Uint8Array')
        }
        const bytes = nodeCrypto.randomBytes(buf.length)
        buf.set(bytes)
        return buf
      }
    }
  } catch (err) {
    // If require('crypto') fails, leave missing and allow tests to surface the error
    // but log for easier debugging
    // eslint-disable-next-line no-console
    console.error('Failed to polyfill globalThis.crypto for tests:', err)
  }
}

// Export nothing; file only needs to run once before tests

