import '@testing-library/jest-dom'
import { vi } from 'vitest'

global.window = Object.create(window)
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'http:',
    hostname: 'localhost',
    port: '',
    href: 'http://localhost/',
    pathname: '/',
    origin: 'http://localhost'
  },
  writable: true
})

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: () => 'blob:test-url',
    revokeObjectURL: () => {}
  },
  writable: true
})

vi.stubEnv('VITE_API_URL', 'http://localhost:3001')