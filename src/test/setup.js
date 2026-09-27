import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
beforeEach(() => { if (typeof localStorage !== 'undefined') localStorage.clear() })
