import { AxiosHeaders } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { requestImages } from '../api'

const request = {
  model: 'image-model',
  group: 'default',
  prompt: 'A mountain',
  size: '1024x1024' as const,
}
afterEach(() => useAuthStore.getState().auth.reset())

test('anonymous direct requests fail before a protected API call', async () => {
  useAuthStore.getState().auth.reset()
  const post = vi.spyOn(api, 'post')
  await expect(requestImages(request)).rejects.toThrow(
    'Sign in to generate images.'
  )
  expect(post).not.toHaveBeenCalled()
})

test('generation includes explicit group and one image with non-replay configuration', async () => {
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'image-user', role: 1 })
  const post = vi.spyOn(api, 'post').mockResolvedValue({
    data: { data: [{ url: 'https://images.example/one.png' }] },
  })
  await requestImages(request)
  expect(post).toHaveBeenCalledWith(
    '/pg/images/generations',
    { ...request, n: 1 },
    expect.objectContaining({
      singleUseAuthorization: true,
      skipAuthRefresh: true,
    })
  )
})

test('editing uses multipart with an explicit group and a browser-generated boundary', async () => {
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'image-user', role: 1 })
  const post = vi.spyOn(api, 'post').mockResolvedValue({
    data: { data: { url: 'https://images.example/one.png' } },
  })
  const file = new File(['image bytes'], 'reference.png', { type: 'image/png' })
  await requestImages({ ...request, reference: file })
  const [path, payload, config] = post.mock.calls[0]
  expect(path).toBe('/pg/images/edits')
  expect(payload).toBeInstanceOf(FormData)
  expect((payload as FormData).get('group')).toBe('default')
  expect((payload as FormData).get('n')).toBe('1')
  expect((payload as FormData).get('image')).toBeInstanceOf(File)
  const headers = new AxiosHeaders({ 'Content-Type': 'application/json' })
  const transforms = config?.transformRequest
  expect(Array.isArray(transforms)).toBe(true)
  if (Array.isArray(transforms)) {
    transforms[0].call({ ...config, headers }, payload, headers)
  }
  expect(headers.has('Content-Type')).toBe(false)
})
