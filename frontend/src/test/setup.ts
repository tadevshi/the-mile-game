import '@testing-library/jest-dom/vitest'

// Mock lottie-web before any modules that depend on it are loaded.
// This must be set up in setup.ts because lottie-web requires HTMLCanvasElement.getContext()
// which is not implemented in jsdom.
vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: vi.fn(() => ({
      destroy: vi.fn(),
      stop: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      goToAndStop: vi.fn(),
      goToAndPlay: vi.fn(),
      getDuration: vi.fn(() => 5),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    destroy: vi.fn(),
  },
}))

// Provide a working localStorage mock for jsdom environments where the
// default `about:blank` origin blocks storage access.
// Using a plain Map-backed implementation that mirrors the Web Storage API.
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
})
