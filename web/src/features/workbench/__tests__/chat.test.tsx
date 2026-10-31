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
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { PricingData } from '@/features/pricing/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { WorkbenchChatPage } from '../chat-page'
import {
  getRetailCatalog,
  getRecommendedSelection,
  isAvailableSelection,
  preserveChatSelection,
  WORKBENCH_DRAFT_KEY,
} from '../selection'

const pricing: PricingData = {
  success: true,
  data: [
    {
      id: 1,
      model_name: 'chat-retail',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['国产-经济', 'svip'],
      supported_endpoint_types: ['openai'],
    },
    {
      id: 2,
      model_name: 'image-only',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['国产-经济'],
      supported_endpoint_types: ['image-generation'],
    },
    {
      id: 3,
      model_name: 'wholesale-only',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['svip'],
      supported_endpoint_types: ['openai'],
    },
  ],
  vendors: [],
  group_ratio: {},
  usable_group: {
    '国产-经济': { desc: '', ratio: 0.2 },
    svip: { desc: '', ratio: 0.1 },
  },
  supported_endpoint: {},
  auto_groups: [],
}

async function renderChat(): Promise<QueryClient> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const root = createRootRoute({ component: WorkbenchChatPage })
  const route = createRoute({ getParentRoute: () => root, path: '/chat' })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/chat'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('textbox', { name: 'Message the assistant' })
  return client
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
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

describe('public workbench chat', () => {
  test('anonymous Send opens existing sign-in form, preserves draft and makes no protected requests', async () => {
    const post = vi.spyOn(api, 'post')
    await renderChat()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message the assistant' }),
      'Keep this idea for me'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(
      await screen.findByRole('dialog', { name: 'Sign in to start chatting' })
    ).toBeVisible()
    expect(screen.getByLabelText('Username or Email')).toBeVisible()
    expect(sessionStorage.getItem(WORKBENCH_DRAFT_KEY)).toBe(
      'Keep this idea for me'
    )
    expect(post).not.toHaveBeenCalled()
    expect(
      vi
        .mocked(api.get)
        .mock.calls.some(([url]) => String(url).includes('/api/user/'))
    ).toBe(false)
  })

  test('restored draft stays unsent and blank input disables Send', async () => {
    sessionStorage.setItem(WORKBENCH_DRAFT_KEY, 'An unsent draft')
    const post = vi.spyOn(api, 'post')
    await renderChat()
    const input = screen.getByRole('textbox', { name: 'Message the assistant' })
    expect(input).toHaveValue('An unsent draft')
    expect(post).not.toHaveBeenCalled()
    await userEvent.clear(input)
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    expect(sessionStorage.getItem(WORKBENCH_DRAFT_KEY)).toBeNull()
  })

  test('signing in restores the draft without automatically sending it', async () => {
    const post = vi.spyOn(api, 'post')
    await renderChat()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message the assistant' }),
      'Review after login'
    )
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/user/self/groups') {
        return {
          data: {
            success: true,
            data: { '国产-经济': { desc: '', ratio: 0.2 } },
          },
        }
      }
      if (url === '/api/user/models') {
        return { data: { success: true, data: ['chat-retail'] } }
      }
      if (url === '/api/status') return { data: { success: true, data: {} } }
      if (url === '/api/pricing') return { data: pricing }
      throw new Error(`Unexpected request: ${url}`)
    })
    await act(async () =>
      useAuthStore
        .getState()
        .auth.setUser({ id: 12, username: 'test-user', role: 1 })
    )
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Message the assistant' })
      ).toHaveValue('Review after login')
    )
    expect(post).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(
        vi
          .mocked(api.get)
          .mock.calls.some(([url]) => url === '/api/user/self/groups')
      ).toBe(true)
    )
    expect(
      screen.getByRole('combobox', { name: 'Select a model' })
    ).not.toHaveTextContent('chat-retail')
  })

  test('account A draft stays private after logout and account B login', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/pricing') return { data: pricing }
      if (url === '/api/user/self/groups') {
        return {
          data: {
            success: true,
            data: { '国产-经济': { desc: '', ratio: 0.2 } },
          },
        }
      }
      if (url === '/api/user/models') {
        return { data: { success: true, data: ['chat-retail'] } }
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'account-a', role: 1 })
    await renderChat()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message the assistant' }),
      'Private account A draft'
    )
    await act(async () => useAuthStore.getState().auth.reset())
    expect(
      screen.getByRole('textbox', { name: 'Message the assistant' })
    ).toHaveValue('')
    await act(async () =>
      useAuthStore
        .getState()
        .auth.setUser({ id: 2, username: 'account-b', role: 1 })
    )
    expect(
      screen.getByRole('textbox', { name: 'Message the assistant' })
    ).toHaveValue('')
    await act(async () =>
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'account-a', role: 1 })
    )
    expect(
      screen.getByRole('textbox', { name: 'Message the assistant' })
    ).toHaveValue('Private account A draft')
  })

  test('authenticated model choices require authorized names and chat endpoint metadata', async () => {
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'account-a', role: 1 })
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/pricing') {
        return {
          data: {
            ...pricing,
            data: [
              ...pricing.data,
              { ...pricing.data[0], id: 20, model_name: 'unauthorized-chat' },
              ...['embeddings', 'openai-response'].map((endpoint, index) => ({
                ...pricing.data[0],
                id: index + 10,
                model_name: endpoint,
                supported_endpoint_types: [endpoint],
              })),
            ],
          },
        }
      }
      if (url === '/api/user/self/groups') {
        return {
          data: {
            success: true,
            data: { '国产-经济': { desc: '', ratio: 0.2 } },
          },
        }
      }
      if (url === '/api/user/models') {
        return {
          data: {
            success: true,
            data: [
              'chat-retail',
              'image-only',
              'embeddings',
              'openai-response',
              'wholesale-only',
            ],
          },
        }
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    await renderChat()
    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select a route' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: '国产-经济' })
    )
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Select a model' })
      ).toHaveTextContent('chat-retail')
    )
    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select a model' })
    )
    expect(
      await screen.findByRole('option', { name: 'chat-retail' })
    ).toBeVisible()
    for (const name of [
      'image-only',
      'embeddings',
      'openai-response',
      'wholesale-only',
      'unauthorized-chat',
    ]) {
      expect(screen.queryByRole('option', { name })).not.toBeInTheDocument()
    }
  })

  test('a restored non-chat model remains unavailable and cannot send authenticated chat', async () => {
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'account-a', role: 1 })
    preserveChatSelection({ group: '国产-经济', model: 'image-only' })
    const post = vi.spyOn(api, 'post')
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/pricing') return { data: pricing }
      if (url === '/api/user/self/groups') {
        return {
          data: {
            success: true,
            data: { '国产-经济': { desc: '', ratio: 0.2 } },
          },
        }
      }
      if (url === '/api/user/models') {
        return { data: { success: true, data: ['image-only', 'chat-retail'] } }
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    await renderChat()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message the assistant' }),
      'Keep this unsent'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose an available route and model before sending.'
    )
    expect(
      screen.getByRole('textbox', { name: 'Message the assistant' })
    ).toHaveValue('Keep this unsent')
    expect(post).not.toHaveBeenCalled()
  })

  test('mobile navigation uses an accessible dialog with selected current page', async () => {
    await renderChat()
    const toggle = screen.getByRole('button', {
      name: 'Open workspace navigation',
    })
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const dialog = await screen.findByRole('dialog', {
      name: 'Workspace navigation',
    })
    expect(dialog.querySelector('a[aria-current="page"]')).toHaveTextContent(
      'Online AI chat'
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })
})

describe('public routing selection', () => {
  test('published retail groups recommend DeepSeek without exposing reseller routes', () => {
    const live = {
      ...pricing,
      usable_group: {
        'DeepSeek-国模之光-性价比0.2x': { desc: '', ratio: 0.2 },
        svip: { desc: '', ratio: 0.1 },
      },
      data: [
        {
          ...pricing.data[0],
          model_name: 'deepseek-v4.1-flash',
          enable_groups: ['DeepSeek-国模之光-性价比0.2x', 'svip'],
        },
      ],
    }
    const catalog = getRetailCatalog(live)
    expect(getRecommendedSelection(catalog)).toEqual({
      group: 'DeepSeek-国模之光-性价比0.2x',
      model: 'deepseek-v4.1-flash',
    })
    expect(catalog.groups.map((group) => group.value)).toEqual([
      'DeepSeek-国模之光-性价比0.2x',
    ])
  })
  test('server string descriptions and separate group ratios retain only explicit retail chat groups', () => {
    const catalog = getRetailCatalog({
      ...pricing,
      usable_group: { '国产-经济': 'Economy chat', svip: 'Wholesale' },
      group_ratio: { '国产-经济': 0.2, svip: 0.1 },
    })
    expect(catalog.groups).toEqual([
      {
        label: '国产-经济',
        value: '国产-经济',
        ratio: 0.2,
        desc: 'Economy chat',
      },
    ])
  })

  test('an empty catalog has no invented default model', () => {
    expect(getRecommendedSelection(getRetailCatalog(undefined))).toBeNull()
  })

  test('catalog excludes wholesale groups and non-chat models', () => {
    const catalog = getRetailCatalog(pricing)
    expect(catalog.groups.map((group) => group.value)).toEqual(['国产-经济'])
    expect(catalog.models.get('国产-经济')).toEqual([
      { label: 'chat-retail', value: 'chat-retail' },
    ])
    expect(catalog.models.has('svip')).toBe(false)
  })
  test('a removed selected model stays unavailable instead of upgrading to a different model', () => {
    const groups = [{ value: '国产-经济', label: '国产-经济', ratio: 1 }]
    expect(
      isAvailableSelection(
        { group: '国产-经济', model: 'removed-cheap-model' },
        groups,
        [{ label: 'expensive-model', value: 'expensive-model' }]
      )
    ).toBe(false)
    expect(
      isAvailableSelection({ group: '国产-经济', model: 'available' }, groups, [
        { label: 'available', value: 'available' },
      ])
    ).toBe(true)
  })
})

test('login refetches owner catalog, keeps default and empty model, then requires user group selection', async () => {
  const post = vi.spyOn(api, 'post')
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === '/api/pricing') return { data: pricing }
    if (url === '/api/user/self/groups') {
      return {
        data: {
          success: true,
          data: { default: { ratio: 1 }, '国产-经济': { ratio: 0.2 } },
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
              : ['chat-retail'],
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  await renderChat()
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Select a model' })
    ).toHaveTextContent('chat-retail')
  )
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Message the assistant' }),
    'Keep draft only'
  )
  await act(async () =>
    useAuthStore.getState().auth.setUser({
      id: 19,
      username: 'registered-account',
      role: 1,
      group: 'default',
    })
  )
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Select a route' })
    ).toHaveTextContent('default')
  )
  expect(
    screen.getByRole('combobox', { name: 'Select a model' })
  ).not.toHaveTextContent('chat-retail')
  expect(
    screen.getByRole('textbox', { name: 'Message the assistant' })
  ).toHaveValue('Keep draft only')
  expect(
    vi.mocked(api.get).mock.calls.filter(([url]) => url === '/api/pricing')
  ).toHaveLength(2)
  await userEvent.click(
    screen.getByRole('combobox', { name: 'Select a route' })
  )
  await userEvent.click(
    await screen.findByRole('option', { name: '国产-经济' })
  )
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Select a model' })
    ).toHaveTextContent('chat-retail')
  )
  expect(post).not.toHaveBeenCalled()
})

test('authenticated restore keeps the assigned group but never automatically fills its available model', async () => {
  useAuthStore.getState().auth.setUser({
    id: 20,
    username: 'assigned-account',
    role: 1,
    group: 'assigned-team',
  })
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === '/api/pricing') {
      return {
        data: {
          ...pricing,
          usable_group: { 'assigned-team': 'Team' },
          data: [
            {
              ...pricing.data[0],
              model_name: 'team-chat',
              enable_groups: ['assigned-team'],
            },
          ],
        },
      }
    }
    if (url === '/api/user/self/groups') {
      return {
        data: {
          success: true,
          data: { 'assigned-team': { ratio: 1 }, default: { ratio: 1 } },
        },
      }
    }
    if (url === '/api/user/models') {
      return { data: { success: true, data: ['team-chat'] } }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  await renderChat()
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Select a route' })
    ).toHaveTextContent('assigned-team')
  )
  expect(
    screen.getByRole('combobox', { name: 'Select a model' })
  ).not.toHaveTextContent('team-chat')
  await userEvent.click(
    screen.getByRole('combobox', { name: 'Select a route' })
  )
  expect(
    await screen.findByRole('option', { name: 'assigned-team' })
  ).toBeVisible()
  expect(screen.getByRole('option', { name: 'default' })).toBeVisible()
})
