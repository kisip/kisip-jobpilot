import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { JobProvider } from '../context/JobContext'
import Jobs from './Jobs'

afterEach(cleanup)

describe('Jobs indexed search', () => {
  it('filters discovered jobs immediately and case-insensitively by title and location', () => {
    render(<JobProvider><Jobs/></JobProvider>)
    const input = screen.getByLabelText('Search indexed jobs')
    expect(screen.getByText('Devops/Cloud Engineer')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'MEXICO' } })
    expect(screen.getByText('Devops/Cloud Engineer')).toBeInTheDocument()
    expect(screen.queryByText('Intermediate Platform Engineer')).not.toBeInTheDocument()
  })
  it('explains that search filters indexed data rather than the live internet', () => {
    render(<JobProvider><Jobs/></JobProvider>)
    expect(screen.getByText(/does not search the internet live/i)).toBeInTheDocument()
    expect(screen.getByText('Jobs currently indexed')).toBeInTheDocument()
  })
})

describe('Jobs location and source controls', () => {
  it('filters the indexed dataset by a dynamic location and source', () => {
    render(<JobProvider><Jobs/></JobProvider>)
    fireEvent.change(screen.getByLabelText('Location filter'), { target: { value: 'Mexico' } })
    expect(screen.getByText('Devops/Cloud Engineer')).toBeInTheDocument()
    expect(screen.queryByText('Intermediate Platform Engineer')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Location filter'), { target: { value: 'All Locations' } })
    fireEvent.change(screen.getByLabelText('Source filter'), { target: { value: 'Remotive' } })
    expect(screen.getByText('No jobs have been discovered yet.')).toBeInTheDocument()
  })
  it('shows counted time filters and a mobile Filters control', () => {
    render(<JobProvider><Jobs/></JobProvider>)
    expect(screen.getByRole('button', { name: /Last 24 Hours \(\d+\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Last 7 Days \(\d+\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filters/ })).toBeInTheDocument()
  })
})

describe('Applications page integration', () => {
  it('shows the complete application tracking columns and original URL', () => {
    const url='https://careers.real-company.dev/jobs/123'
    localStorage.setItem('jobpilot.jobs.v1',JSON.stringify([{title:'Tracked DevOps Job',company:'Real Company',location:'Kochi',experience:'1 Year',source:'Manual link',url,skills:['Linux'],workMode:'Hybrid',jobType:'Full-time',discoveredAt:'2026-08-23T10:00:00Z',applicationStartedAt:'2026-08-23T11:00:00Z',resumeVersion:'Anandha Krishnan DevOps CV v1',matchScore:90,status:'Application Started',notes:'Follow up'}]))
    render(<JobProvider><Jobs preset="applications"/></JobProvider>)
    expect(screen.getByText('Tracked DevOps Job')).toBeInTheDocument()
    for(const heading of ['Source','Location','Application date','Resume used','Match','Status','Original URL','Notes','Follow-up']) expect(screen.getByRole('columnheader',{name:heading})).toBeInTheDocument()
    expect(screen.getByRole('link',{name:/Open/})).toHaveAttribute('href',url)
  })
})
