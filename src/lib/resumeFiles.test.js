import { describe, expect, it } from 'vitest'
import { formatFileSize } from './resumeFiles'
describe('resume file metadata', () => { it('formats browser-local PDF sizes', () => { expect(formatFileSize(1048576)).toBe('1.00 MB'); expect(formatFileSize(0)).toBe('No PDF selected') }) })
