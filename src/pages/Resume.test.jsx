import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { JobProvider } from '../context/JobContext'
import Resume from './Resume'

vi.mock('../lib/resumeFiles', () => ({ saveResumeFile: vi.fn(() => Promise.resolve()), deleteResumeFile: vi.fn(() => Promise.resolve()), formatFileSize: bytes => `${bytes} bytes` }))

describe('Resume page', () => {
  it('shows the CV profile and required version controls', () => { render(<JobProvider><Resume/></JobProvider>); expect(screen.getByText('Anandha Krishnan DevOps CV')).toBeInTheDocument(); expect(screen.getByText('DevOps / Linux / System Administration')).toBeInTheDocument(); expect(screen.getByText('Junior Server Administrator / DevOps-oriented experience')).toBeInTheDocument(); expect(screen.getByText('GitLab CI/CD')).toBeInTheDocument(); expect(screen.getByText('Active')).toBeInTheDocument(); expect(screen.getByText('Select PDF')).toBeInTheDocument(); expect(screen.getByText('Edit Details')).toBeInTheDocument(); expect(screen.getByText('Delete Version')).toBeInTheDocument() })
  it('stores only selected PDF metadata in resume state', async () => { render(<JobProvider><Resume/></JobProvider>); const input = screen.getAllByLabelText('Select PDF')[0]; const file = new File(['private pdf'], 'Anandha-CV.pdf', { type: 'application/pdf' }); fireEvent.change(input, { target: { files: [file] } }); await waitFor(() => expect(screen.getByText('Anandha-CV.pdf')).toBeInTheDocument()); expect(screen.getByText(`${file.size} bytes`)).toBeInTheDocument(); expect(screen.getByText('Replace PDF')).toBeInTheDocument() })
})
