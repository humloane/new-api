import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { getHomeAnnouncements } from '../announcements'
import { HomeAnnouncements } from '../home-announcements'

const state = vi.hoisted(() => ({
  status: { announcements_enabled: true, announcements: [] as unknown[] },
  loading: false,
  isPlaceholderData: false,
  error: null as unknown,
}))
vi.mock('@/hooks/use-status', () => ({ useStatus: () => state }))

beforeEach(() => {
  state.status = { announcements_enabled: true, announcements: [] }
  state.loading = false
  state.isPlaceholderData = false
  state.error = null
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false,
  })
})
afterEach(() => vi.restoreAllMocks())

test('disabled, empty, blank and malformed announcements never open a popup', async () => {
  expect(getHomeAnnouncements(null)).toEqual([])
  expect(
    getHomeAnnouncements([null, {}, { content: '  ' }, { content: 4 }])
  ).toEqual([])
  state.status = {
    announcements_enabled: false,
    announcements: [{ content: 'Disabled notice' }],
  }
  const view = render(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  state.status = { announcements_enabled: true, announcements: [] }
  view.rerender(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('published announcements wait for page load, support safe rich text and close without reopening', async () => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: 'loading',
  })
  state.status.announcements = [
    {
      id: 1,
      content: '**Maintenance complete** <script>window.bad=1</script>',
      publishDate: '2026-10-31T09:00:00Z',
      extra: 'All services restored.',
    },
  ]
  const view = render(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  act(() => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    })
    fireEvent.load(window)
  })
  const dialog = await screen.findByRole('dialog', {
    name: 'Platform announcements',
  })
  expect(dialog).toHaveTextContent('Maintenance complete')
  expect(dialog.querySelector('script')).toBeNull()
  expect(dialog).toHaveTextContent('All services restored.')
  await userEvent.click(screen.getByRole('button', { name: 'Got it' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  view.rerender(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('cached or failed status does not show a notice until successful data becomes ready', async () => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: 'complete',
  })
  state.status.announcements = [{ content: 'Service update' }]
  state.loading = true
  const view = render(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  state.loading = false
  state.error = new Error('Unavailable')
  view.rerender(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  state.error = null
  view.rerender(<HomeAnnouncements />)
  await screen.findByRole('dialog', { name: 'Platform announcements' })
  state.status.announcements_enabled = false
  view.rerender(<HomeAnnouncements />)
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
})

test('sorts newest first and tolerates invalid publish dates', () => {
  expect(
    getHomeAnnouncements([
      { content: 'Old', publishDate: '2026-01-01' },
      { content: 'Invalid', publishDate: 'invalid' },
      { content: 'New', publishDate: '2026-10-31' },
    ]).map((item) => item.content)
  ).toEqual(['New', 'Old', 'Invalid'])
})

test('does not announce stale localStorage placeholder data before the current status response', async () => {
  state.status.announcements = [{ content: 'Cached announcement' }]
  state.isPlaceholderData = true
  const view = render(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  state.isPlaceholderData = false
  state.status.announcements = []
  view.rerender(<HomeAnnouncements />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
