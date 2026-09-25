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
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/context/theme-provider'
import zh from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY, type StatusData } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Home } from '..'
import { HeroTerminalDemo } from '../components/hero-terminal-demo'

let client: QueryClient
let homeContent: string
let status: StatusData

beforeEach(async () => {
  localStorage.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useSystemConfigStore.getState().setConfig({ systemName: 'AIMOXT' })
  useSystemConfigStore.getState().setLoading(false)
  await i18next.changeLanguage('en')
  client = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
  })
  homeContent = ''
  status = {
    register_enabled: true,
    server_address: 'https://api.example.com/gateway/',
    docs_link: 'https://docs.example.com/start',
    HeaderNavModules: { pricing: { enabled: true, requireAuth: false } },
  }
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/home_page_content') {
      return { data: { success: true, data: homeContent } }
    }
    throw new Error(`Unexpected home request: ${url}`)
  })
})

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
  await i18next.changeLanguage('en')
  i18next.removeResourceBundle('zhCN', 'translation')
})

async function renderHome() {
  client.setQueryData(STATUS_QUERY_KEY, status)
  const router = createRouter({
    routeTree: createRootRoute({ component: Home }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme='light'>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

it('renders the complete default landing when custom content is empty', async () => {
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  const main = within(screen.getByRole('main'))
  expect(main.getByRole('heading', { level: 1 })).toHaveTextContent(
    'AI model APIs,'
  )
  expect(
    main.getByRole('heading', { name: 'Less integration work. More building.' })
  ).toBeVisible()
  expect(
    main.getByRole('heading', { name: 'Three steps to get started' })
  ).toBeVisible()
  expect(
    main.getByRole('heading', {
      name: 'Your next idea starts with an API call.',
    })
  ).toBeVisible()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('New API')
  expect(main.queryByText(/200 ok|142|\$0\.000/)).not.toBeInTheDocument()
})

it('presents the getting-started steps in order with mobile stacking and header clearance', async () => {
  await renderHome()
  const section = await screen.findByRole('region', {
    name: 'Three steps to get started',
  })
  expect(section).toHaveClass('scroll-mt-24')
  const steps = within(section).getByRole('list')
  expect(steps.tagName).toBe('OL')
  expect(steps).toHaveClass('flex-col')
  expect(within(steps).getAllByRole('listitem')).toHaveLength(3)
  expect(
    within(steps)
      .getAllByRole('heading')
      .map((heading) => heading.textContent)
  ).toEqual([
    'Create your account',
    'Choose a model and key',
    'Make your first request',
  ])
})

it('keeps every static use case readable without presenting it as an interactive control', async () => {
  await renderHome()
  const section = await screen.findByRole('region', {
    name: 'From a first experiment to your application.',
  })
  expect(within(section).getAllByRole('article')).toHaveLength(4)
  for (const article of within(section).getAllByRole('article')) {
    expect(within(article).queryByRole('link')).not.toBeInTheDocument()
    expect(within(article).queryByRole('button')).not.toBeInTheDocument()
    expect(within(article).getByRole('heading', { level: 3 })).toBeVisible()
    expect(article).toHaveTextContent(/Evaluate|Validate|Match|Check/)
  }
})

it('uses the landing header only for the built-in homepage', async () => {
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  expect(screen.getByRole('banner')).toHaveClass('aimoxt-header')
  cleanup()
  client.clear()
  homeContent = '# Custom layout'
  await renderHome()
  await screen.findByRole('heading', { name: 'Custom layout' })
  expect(screen.getByRole('banner')).not.toHaveClass('aimoxt-header')
})

it('keeps six FAQ answers in three informational groups', async () => {
  await renderHome()
  const faq = await screen.findByRole('region', {
    name: 'Before your first request',
  })
  const groups = within(faq).getAllByRole('article')
  expect(groups).toHaveLength(3)
  for (const group of groups) {
    expect(within(group).getAllByRole('button')).toHaveLength(2)
  }
})

it('shows real footer destinations without enabling demo-site behavior', async () => {
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  const footer = within(screen.getByRole('contentinfo'))
  expect(footer.getByRole('link', { name: 'Base URL' })).toHaveAttribute(
    'href',
    '#integration'
  )
  expect(footer.getByRole('link', { name: 'Docs' })).toHaveAttribute(
    'href',
    status.docs_link
  )
  expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/QuantumNous/new-api'
  )
})

it('preserves custom footer HTML and legal visibility over landing columns', async () => {
  useSystemConfigStore
    .getState()
    .setConfig({ footerHtml: '<p>Operator footer</p>' })
  status.privacy_policy_enabled = true
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  const footer = within(screen.getByRole('contentinfo'))
  expect(footer.getByText('Operator footer')).toBeVisible()
  expect(
    footer.queryByRole('link', { name: 'Base URL' })
  ).not.toBeInTheDocument()
  expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy-policy'
  )
  expect(
    footer.queryByRole('link', { name: 'User Agreement' })
  ).not.toBeInTheDocument()
  expect(footer.getByRole('link', { name: 'New API' })).toBeVisible()
})

it('replaces the built-in landing with configured Markdown', async () => {
  homeContent = '# Operator announcement'
  await renderHome()
  expect(
    await screen.findByRole('heading', { name: 'Operator announcement' })
  ).toBeVisible()
  expect(
    screen.queryByRole('heading', {
      name: /AI model APIs,\s*one integration\./,
    })
  ).not.toBeInTheDocument()
})

it('preserves configured URL embedding instead of displaying the landing', async () => {
  homeContent = 'https://landing.example.com'
  await renderHome()
  const iframe = await screen.findByTitle('Custom Home Page')
  expect(iframe).toHaveAttribute('src', homeContent)
  expect(iframe).toHaveAttribute(
    'sandbox',
    expect.stringContaining('allow-top-navigation-by-user-activation')
  )
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
})

it('clears previously cached custom content when the server returns empty content', async () => {
  localStorage.setItem('home_page_content', '# Old landing')
  await renderHome()
  expect(
    await screen.findByRole('heading', {
      level: 1,
      name: /AI model APIs,\s*one integration\./,
    })
  ).toBeVisible()
  expect(localStorage.getItem('home_page_content')).toBeNull()
  expect(
    screen.queryByRole('heading', { name: 'Old landing' })
  ).not.toBeInTheDocument()
})

it.each([
  {
    authenticated: false,
    registration: true,
    label: 'Get API access',
    href: '/sign-up',
  },
  {
    authenticated: false,
    registration: false,
    label: 'Sign in',
    href: '/sign-in',
  },
  {
    authenticated: true,
    registration: false,
    label: 'Go to Dashboard',
    href: '/dashboard',
  },
])(
  'offers $label when authenticated=$authenticated and registration=$registration',
  async ({ authenticated, registration, label, href }) => {
    status.register_enabled = registration
    if (authenticated) {
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'developer', role: 1 })
    }
    await renderHome()
    await screen.findByRole('heading', { level: 1 })
    const main = within(screen.getByRole('main'))
    const links = main.getAllByRole('link', { name: label })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute('href', href)
    if (!registration) {
      expect(
        main.queryByRole('link', { name: 'Get API access' })
      ).not.toBeInTheDocument()
    }
  }
)

it('hides pricing and documentation actions when their modules are disabled', async () => {
  status.HeaderNavModules = { pricing: false, docs: false }
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  const main = within(screen.getByRole('main'))
  expect(
    main.queryByRole('link', { name: 'Models & pricing' })
  ).not.toBeInTheDocument()
  expect(main.queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument()
})

it('identifies authentication-required pricing without bypassing the route guard', async () => {
  status.HeaderNavModules = { pricing: { enabled: true, requireAuth: true } }
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  for (const link of within(screen.getByRole('main')).getAllByRole('link', {
    name: 'Sign in to view pricing',
  })) {
    expect(link).toHaveAttribute('href', '/pricing')
  }
})

it('uses the configured external documentation address with safe link attributes', async () => {
  await renderHome()
  await screen.findByRole('heading', { level: 1 })
  for (const link of within(screen.getByRole('main')).getAllByRole('link', {
    name: 'Docs',
  })) {
    expect(link).toHaveAttribute('href', 'https://docs.example.com/start')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

it('copies the currently selected protocol with the configured server path intact', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderHome()
  await user.click(await screen.findByRole('tab', { name: 'Claude' }))
  const panel = screen.getByRole('tabpanel', { name: 'Claude' })
  await user.click(within(panel).getByRole('button', { name: 'Copy code' }))
  const command = await navigator.clipboard.readText()
  expect(writeText).toHaveBeenCalledWith(command)
  expect(command).toContain("API_BASE_URL='https://api.example.com/gateway'")
  expect(command).toContain('${API_BASE_URL}/v1/messages')
  expect(command).toContain('x-api-key: $API_KEY')
  expect(command).toContain('Content-Type: application/json')
  expect(command).toContain('YOUR_MODEL_ID')
  expect(
    await within(panel).findByRole('button', { name: 'Copied' })
  ).toBeVisible()
})

it('supports keyboard protocol selection with matching accessible panel state', async () => {
  const user = userEvent.setup()
  await renderHome()
  const chat = await screen.findByRole('tab', { name: 'Chat' })
  await user.click(chat)
  await user.keyboard('{ArrowRight}{Enter}')
  const responses = screen.getByRole('tab', { name: 'Responses' })
  expect(responses).toHaveFocus()
  expect(responses).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel', { name: 'Responses' })).toHaveTextContent(
    '/v1/responses'
  )
  expect(chat).toHaveAttribute('aria-selected', 'false')
})

it('uses the current origin when no API server address is configured', async () => {
  delete status.server_address
  await renderHome()
  const panel = await screen.findByRole('tabpanel', { name: 'Chat' })
  expect(panel).toHaveTextContent(`API_BASE_URL='${window.location.origin}'`)
})

it('does not offer automatic example cycling when reduced motion is requested', async () => {
  await renderHome()
  await screen.findByRole('tab', { name: 'Chat' })
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Pause examples' })
    ).not.toBeInTheDocument()
  )
  expect(
    screen.queryByRole('button', { name: 'Resume examples' })
  ).not.toBeInTheDocument()
})

it('keeps long API addresses inside a bounded, keyboard-focusable code scroller', async () => {
  status.server_address = `https://api.example.com/${'long-path-'.repeat(30)}`
  await renderHome()
  const panel = await screen.findByRole('tabpanel', { name: 'Chat' })
  const code = within(panel).getByLabelText('Code example')
  expect(code).toHaveAttribute('tabindex', '0')
  expect(code).toHaveTextContent(status.server_address as string)
  expect(code.closest('.code-block-scroll')).toHaveClass(
    'overflow-auto',
    'max-w-full',
    'h-64'
  )
})

it('quotes apostrophes in the configured API address without shell expansion', async () => {
  const user = userEvent.setup()
  status.server_address = "https://api.example.com/team's/"
  await renderHome()
  const panel = await screen.findByRole('tabpanel', { name: 'Chat' })
  await user.click(within(panel).getByRole('button', { name: 'Copy code' }))
  expect(await navigator.clipboard.readText()).toContain(
    "API_BASE_URL='https://api.example.com/team'\"'\"'s'"
  )
})

it('pauses automatic cycling after manual selection and resumes only on request', async () => {
  const matchMedia = window.matchMedia
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...matchMedia(query),
    matches: false,
  }))
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const user = userEvent.setup()
  render(<HeroTerminalDemo serverAddress='https://api.example.com' />)
  act(() => {
    vi.advanceTimersByTime(4500)
  })
  expect(screen.getByRole('tab', { name: 'Responses' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await user.click(screen.getByRole('tab', { name: 'Claude' }))
  act(() => {
    vi.advanceTimersByTime(9000)
  })
  expect(screen.getByRole('tab', { name: 'Claude' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await user.click(screen.getByRole('button', { name: 'Resume examples' }))
  act(() => {
    vi.advanceTimersByTime(4500)
  })
  expect(screen.getByRole('tab', { name: 'Gemini' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
})

it('provides working section targets for every local guide link', async () => {
  await renderHome()
  const nav = await screen.findByRole('navigation', { name: 'On this page' })
  for (const link of within(nav).getAllByRole('link')) {
    const target = document.querySelector(
      link.getAttribute('href') || '#missing-target'
    )
    expect(target).not.toBeNull()
    expect(target).toHaveClass('scroll-mt-24')
  }
})

it('expands and collapses integration answers from the keyboard', async () => {
  const user = userEvent.setup()
  await renderHome()
  const trigger = await screen.findByRole('button', {
    name: 'Can I keep my existing SDK?',
  })
  trigger.focus()
  await user.keyboard('{Enter}')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText(/Often, when the SDK accepts/)).toBeVisible()
  await user.keyboard('{Enter}')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

it('emits website data only for the built-in homepage with an explicit site origin', async () => {
  vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://www.example.com')
  try {
    await renderHome()
    await screen.findByRole('heading', { level: 1 })
    const script = document.querySelector('script[type="application/ld+json"]')
    expect(JSON.parse(script?.textContent || '')).toMatchObject({
      '@graph': expect.arrayContaining([
        expect.objectContaining({
          '@type': 'WebSite',
          url: 'https://www.example.com/',
        }),
      ]),
    })
    cleanup()
    client.clear()
    homeContent = '# Custom page'
    await renderHome()
    await screen.findByRole('heading', { name: 'Custom page' })
    expect(
      document.querySelector('script[type="application/ld+json"]')
    ).toBeNull()
  } finally {
    vi.unstubAllEnvs()
  }
})

it('updates the heading and actions when the interface language changes', async () => {
  i18next.addResourceBundle('zhCN', 'translation', zh.translation)
  await renderHome()
  await screen.findByRole('heading', {
    level: 1,
    name: /AI model APIs,\s*one integration\./,
  })
  await act(async () => {
    await i18next.changeLanguage('zhCN')
  })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    '大模型 API，一次接入。'
  )
  expect(
    within(screen.getByRole('main')).getAllByRole('link', { name: '立即接入' })
  ).toHaveLength(2)
})
