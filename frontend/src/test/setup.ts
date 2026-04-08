import '@testing-library/jest-dom/vitest'
import React from 'react'
import type { CSSProperties } from 'react'

function MockLottiePlayer({ style }: { style?: CSSProperties }) {
  return React.createElement('div', { 'data-testid': 'lottie-player', style })
}

// Mock lottie-react (which internally uses lottie-web that requires HTMLCanvasElement.getContext()
// which is not implemented in jsdom). Must mock before any module that depends on lottie-react loads.
vi.mock('lottie-react', () => ({
  default: {
    __esModule: true,
    ReactLottie: MockLottiePlayer,
  },
  ReactLottie: MockLottiePlayer,
}))

function createMockContext2D(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    clearRect: () => {},
    fillRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(), colorSpace: 'srgb', height: 0, width: 0 }),
    putImageData: () => {},
    createImageData: () => new ImageData(0, 0),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    measureText: () => ({
      width: 0,
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 0,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 0,
      fontBoundingBoxAscent: 0,
      fontBoundingBoxDescent: 0,
      emHeightAscent: 0,
      emHeightDescent: 0,
      hangingBaseline: 0,
      alphabeticBaseline: 0,
      ideographicBaseline: 0,
    }),
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    rect: () => {},
    canvas: document.createElement('canvas'),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    clip: () => {},
    isPointInPath: () => false,
    isPointInStroke: () => false,
    fillText: () => {},
    strokeText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }) as CanvasGradient,
    createPattern: () => null,
    createRadialGradient: () => ({ addColorStop: () => {} }) as CanvasGradient,
    drawFocusIfNeeded: () => {},
    scrollPathIntoView: () => {},
    resetTransform: () => {},
    direction: 'inherit',
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    lineCap: 'butt',
    lineDashOffset: 0,
    lineJoin: 'miter',
    lineWidth: 1,
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    strokeStyle: '',
    fillStyle: '',
    fontKerning: 'auto',
    fontStretch: 'normal',
    fontVariantCaps: 'normal',
    letterSpacing: '0px',
    lineDash: () => [],
    setLineDash: () => {},
    getLineDash: () => [],
    lineTo: () => {},
    roundRect: () => {},
    strokeRect: () => {},
    transform: () => {},
    wordSpacing: '0px',
  } as unknown as CanvasRenderingContext2D
}

// Stub canvas getContext since jsdom doesn't implement it and lottie-web depends on it
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === '2d') {
      return createMockContext2D()
    }
    return null
  }
}

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
