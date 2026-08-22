import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import JobTable from './JobTable'
import { JobProvider } from '../context/JobContext'

describe('JobTable', () => {
  it('shows the real-jobs empty state', () => { render(<JobProvider><JobTable jobs={[]} onEdit={() => {}} /></JobProvider>); expect(screen.getByText('No real jobs discovered yet.')).toBeInTheDocument(); expect(screen.getByText(/Configure a permitted job source/)).toBeInTheDocument() })
  it('disables links when a URL is unavailable', () => { const job = { id: 'bad', title: 'DevOps Engineer', company: 'Company', location: 'India', experience: '1 Year', source: 'Manual', datePosted: '', dateDiscovered: '2026-08-22', matchScore: 80, matchDetails: {}, status: 'New', skills: [], jobType: 'Full-time', workMode: 'Remote', url: '', applyUrl: '' }; render(<JobProvider><JobTable jobs={[job]} onEdit={() => {}} /></JobProvider>); expect(screen.getAllByText('Application URL unavailable')).toHaveLength(2) })
  it('uses the real listing URL for View Job and Apply without submitting', () => {
    const url = 'https://remotive.com/remote-jobs/devops/real-listing-123'
    const job = { id: 'real', title: 'Junior DevOps Engineer', company: 'Company', location: 'Remote, India', experience: '1 Year', source: 'Remotive Public API', datePosted: '2026-08-20', dateDiscovered: '2026-08-22', matchScore: 92, matchDetails: {}, status: 'New', skills: ['Linux'], jobType: 'Full-time', workMode: 'Remote', url, applyUrl: url }
    render(<JobProvider><JobTable jobs={[job]} onEdit={() => {}} /></JobProvider>)
    expect(screen.getByRole('link', { name: /View Job/ })).toHaveAttribute('href', url)
    expect(screen.getByRole('link', { name: /Apply/ })).toHaveAttribute('href', url)
    expect(screen.getByRole('link', { name: /Apply/ })).toHaveAttribute('target', '_blank')
  })
})
