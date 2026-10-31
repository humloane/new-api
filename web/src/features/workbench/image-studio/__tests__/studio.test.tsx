import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { PricingData } from '@/features/pricing/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { getImageCatalog } from '../catalog'
import { IMAGE_DRAFT_KEY } from '../images'
import { ImageStudio } from '../ImageStudio'

const pricing: PricingData = {
  success: true,
  data: [],
  vendors: [],
  group_ratio: {},
  usable_group: {},
  supported_endpoint: {},
  auto_groups: [],
}

beforeEach(() => {
  sessionStorage.clear()
  useSystemConfigStore
    .getState()
    .setConfig({ currency: DEFAULT_CURRENCY_CONFIG })
  useAuthStore.getState().auth.reset()
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/pricing') return { data: pricing }
    if (url === '/api/status') {
      return {
        data: {
          success: true,
          data: { register_enabled: true, password_login_enabled: true },
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
})
afterEach(() => {
  useAuthStore.getState().auth.reset()
  sessionStorage.clear()
})

async function renderStudio(): Promise<QueryClient> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const root = createRootRoute({
    component: () => <ImageStudio onOpenCanvas={() => {}} />,
  })
  const route = createRoute({ getParentRoute: () => root, path: '/canvas' })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/canvas'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('textbox', { name: 'Image prompt' })
  return client
}

test('anonymous generation opens sign-in and preserves prompt without protected calls', async () => {
  const post = vi.spyOn(api, 'post')
  await renderStudio()
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Image prompt' }),
    'A quiet mountain at sunrise'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Generate image' }))
  expect(await screen.findByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('Username or Email')).toBeVisible()
  expect(sessionStorage.getItem(IMAGE_DRAFT_KEY)).toBe(
    'A quiet mountain at sunrise'
  )
  expect(post).not.toHaveBeenCalled()
  expect(
    vi
      .mocked(api.get)
      .mock.calls.some(([url]) => String(url).includes('/api/user/'))
  ).toBe(false)
})

test('an empty catalog offers an honest unavailable state and disables model selection', async () => {
  await renderStudio()
  expect(
    await screen.findByText('No image generation models available')
  ).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Image model' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Generate image' })).toBeDisabled()
})

test('image editing requires explicit image-edit metadata', () => {
  const base = {
    id: 1,
    model_name: 'image-model',
    quota_type: 1,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
  }
  const catalog = {
    ...pricing,
    usable_group: { default: { desc: '', ratio: 1 } },
    data: [{ ...base, supported_endpoint_types: ['image-generation'] }],
  }
  expect(getImageCatalog(catalog, false).models).toHaveLength(1)
  expect(getImageCatalog(catalog, true).models).toHaveLength(0)
  expect(
    getImageCatalog(
      {
        ...catalog,
        data: [{ ...base, supported_endpoint_types: ['image-edit'] }],
      },
      true
    ).models
  ).toHaveLength(1)
  expect(
    getImageCatalog({ ...catalog, data: [base] }, false).models
  ).toHaveLength(0)
})

test('anonymous image prompt transfers once on login without generation and never reaches account B', async () => {
  const post = vi.spyOn(api, 'post')
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === '/api/pricing') return { data: pricing }
    if (url === '/api/user/self/groups') {
      return { data: { success: true, data: {} } }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  await renderStudio()
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Image prompt' }),
    'Anonymous image idea'
  )
  await act(async () =>
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'account-a', role: 1 })
  )
  expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue(
    'Anonymous image idea'
  )
  expect(post).not.toHaveBeenCalled()
  await userEvent.clear(screen.getByRole('textbox', { name: 'Image prompt' }))
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Image prompt' }),
    'Private account A image'
  )
  await act(async () => useAuthStore.getState().auth.reset())
  expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('')
  await act(async () =>
    useAuthStore
      .getState()
      .auth.setUser({ id: 2, username: 'account-b', role: 1 })
  )
  expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('')
  await act(async () =>
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'account-a', role: 1 })
  )
  expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue(
    'Private account A image'
  )
  expect(post).not.toHaveBeenCalled()
})

test.each([false, true])(
  'server-shaped anonymous image catalog renders CNY fixed price or usage wording for expression=%s',
  async (expression) => {
    useSystemConfigStore.getState().setConfig({
      currency: {
        ...DEFAULT_CURRENCY_CONFIG,
        quotaDisplayType: 'CNY',
        usdExchangeRate: 7,
      },
    })
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/pricing') {
        return {
          data: {
            ...pricing,
            usable_group: { default: 'Default group' },
            group_ratio: { default: 1.5 },
            data: [
              {
                id: 1,
                model_name: 'image-model',
                quota_type: 1,
                model_price: 0.04,
                model_ratio: 1,
                completion_ratio: 1,
                enable_groups: ['default'],
                supported_endpoint_types: ['image-generation'],
                ...(expression
                  ? {
                      billing_mode: 'tiered_expr',
                      billing_expr: 'image_count * 0.04',
                    }
                  : {}),
              },
            ],
          },
        }
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    await renderStudio()
    if (expression) {
      expect(
        await screen.findByText(
          'Price depends on the selected model and actual usage.'
        )
      ).toBeVisible()
      expect(screen.queryByText(/Catalog price:/)).not.toBeInTheDocument()
    } else {
      expect(
        await screen.findByText(/Catalog price:.*0\.42 per request/)
      ).toBeVisible()
    }
  }
)

test('image login keeps default and empty model until the user selects an authorized image group', async () => {
  const post = vi.spyOn(api, 'post')
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === '/api/pricing') {
      return {
        data: {
          ...pricing,
          usable_group: { 'image-group': 'Images' },
          data: [
            {
              id: 1,
              model_name: 'image-model',
              quota_type: 1,
              enable_groups: ['image-group'],
              supported_endpoint_types: ['image-generation'],
            },
          ],
        },
      }
    }
    if (url === '/api/user/self/groups') {
      return {
        data: {
          success: true,
          data: { default: { ratio: 1 }, 'image-group': { ratio: 1 } },
        },
      }
    }
    if (url === '/api/user/models') {
      return {
        data: {
          success: true,
          data:
            (config?.params as { group?: string })?.group === 'default'
              ? []
              : ['image-model'],
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  await renderStudio()
  await act(async () =>
    useAuthStore.getState().auth.setUser({
      id: 28,
      username: 'image-user',
      role: 1,
      group: 'default',
    })
  )
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Image group' })
    ).toHaveTextContent('default')
  )
  expect(
    screen.getByRole('combobox', { name: 'Image model' })
  ).not.toHaveTextContent('image-model')
  await userEvent.click(screen.getByRole('combobox', { name: 'Image group' }))
  await userEvent.click(
    await screen.findByRole('option', { name: 'image-group' })
  )
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Image model' })
    ).toHaveTextContent('image-model')
  )
  expect(post).not.toHaveBeenCalled()
})

test('logged in empty image catalog still offers backend default group with no model', async () => {
  useAuthStore
    .getState()
    .auth.setUser({ id: 29, username: 'image-user', role: 1, group: 'default' })
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === '/api/pricing') return { data: pricing }
    if (url === '/api/user/self/groups') {
      return { data: { success: true, data: { default: { ratio: 1 } } } }
    }
    if (url === '/api/user/models') return { data: { success: true, data: [] } }
    throw new Error(`Unexpected request: ${url}`)
  })
  await renderStudio()
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Image group' })
    ).toHaveTextContent('default')
  )
  expect(
    screen.getByRole('combobox', { name: 'Image group' })
  ).not.toBeDisabled()
  expect(screen.getByRole('combobox', { name: 'Image model' })).toBeDisabled()
})
