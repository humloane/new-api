/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SoleLanding } from '..'
import type { LandingActions } from '../../types'

let client: QueryClient
const actions: LandingActions = {
  isAuthenticated: false,
  registrationEnabled: true,
  pricingEnabled: true,
  pricingRequiresAuth: false,
  docsUrl: 'https://docs.example.com',
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, {})
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useSystemConfigStore.getState().setConfig({ systemName: 'AIMOXT' })
  useSystemConfigStore.getState().setLoading(false)
})

afterEach(() => {
  cleanup()
  client.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
})

async function renderLanding(overrides: Partial<LandingActions> = {}) {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <SoleLanding
          actions={{ ...actions, ...overrides }}
          serverAddress='https://api.example.com/'
        />
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

it('provides assistant and canvas entry links in both navigation and hero', async () => {
  await renderLanding()
  const nav = within(
    screen.getByRole('navigation', { name: 'Main navigation' })
  )
  expect(nav.getByRole('link', { name: /Online AI chat/ })).toHaveAttribute(
    'href',
    '/chat'
  )
  expect(
    nav.getByRole('link', { name: /Image creation canvas/ })
  ).toHaveAttribute('href', '/canvas')
  const hero = within(
    screen.getByRole('region', { name: /One API for every idea/ })
  )
  expect(hero.getByRole('link', { name: /Online AI chat/ })).toHaveAttribute(
    'href',
    '/chat'
  )
  expect(
    hero.getByRole('link', { name: /Image creation canvas/ })
  ).toHaveAttribute('href', '/canvas')
  expect(screen.getByRole('contentinfo')).toHaveTextContent('New API')
  expect(screen.getByRole('contentinfo')).toHaveTextContent('AGPL-3.0')
})

it('uses sign-in actions and hides pricing when registration and catalog are disabled', async () => {
  await renderLanding({ registrationEnabled: false, pricingEnabled: false })
  const hero = within(
    screen.getByRole('region', { name: /One API for every idea/ })
  )
  expect(hero.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    '/sign-in'
  )
  expect(
    hero.queryByRole('link', { name: 'Explore models' })
  ).not.toBeInTheDocument()
  expect(
    hero.queryByRole('link', { name: 'Get API access' })
  ).not.toBeInTheDocument()
})

it('allows keyboard users to open the chart FAQ and read the demo disclosure', async () => {
  await renderLanding()
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', {
    name: 'Are the charts on this page live?',
  })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  trigger.focus()
  await user.keyboard('{Enter}')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText(/No\. Cards marked Demo/)).toBeVisible()
  expect(
    screen.getByText('Illustrative data. No performance claim.')
  ).toBeVisible()
})

it('opens mobile navigation by keyboard and closes it after an anchor link', async () => {
  await renderLanding()
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Open navigation' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  trigger.focus()
  await user.keyboard('{Enter}')
  const menu = await screen.findByRole('dialog', { name: 'Explore AIMOXT' })
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(
    within(menu).getByRole('link', { name: /Online AI chat/ })
  ).toHaveAttribute('href', '/chat')
  expect(
    within(menu).getByRole('link', { name: /Image creation canvas/ })
  ).toHaveAttribute('href', '/canvas')
  await user.click(within(menu).getByRole('link', { name: 'Capabilities' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

it('returns keyboard focus to the menu trigger when Escape closes navigation', async () => {
  await renderLanding()
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Open navigation' })
  await user.click(trigger)
  await screen.findByRole('dialog', { name: 'Explore AIMOXT' })
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('explains what each first-use action does without claiming AI image generation', async () => {
  await renderLanding()
  const hero = within(
    screen.getByRole('region', { name: /One API for every idea/ })
  )
  expect(hero.getByRole('link', { name: /Online AI chat/ })).toHaveTextContent(
    'No API key needed'
  )
  expect(
    hero.getByRole('link', { name: /Image creation canvas/ })
  ).toHaveTextContent('Upload images, arrange and annotate')
})

it('uses transparent navigation at the top and marks glass navigation after scrolling', async () => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  await renderLanding()
  const header = screen.getByRole('banner')
  expect(header).toHaveAttribute('data-scrolled', 'false')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 })
  fireEvent.scroll(window)
  expect(header).toHaveAttribute('data-scrolled', 'true')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  fireEvent.scroll(window)
  expect(header).toHaveAttribute('data-scrolled', 'false')
})
