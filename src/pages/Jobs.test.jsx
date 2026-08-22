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
