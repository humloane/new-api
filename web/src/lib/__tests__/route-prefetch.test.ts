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
import type { AnyRoute, AnyRouter } from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { scheduleRouteChunkPrefetch } from '../route-prefetch'

afterEach(() => {
  vi.useRealTimers()
})

describe('idle route chunk prefetch', () => {
  it.each(['/', '/chat', '/canvas', '/sign-in', '/pricing'])(
    'does not download unrelated console or pricing chunks on %s, even when signed in',
    (pathname) => {
      vi.useFakeTimers()
      const loadRouteChunk = vi.fn()
      const router = {
        state: { location: { pathname } },
        routesById: { '/_authenticated/dashboard/': {} },
        loadRouteChunk,
      } as unknown as AnyRouter

      scheduleRouteChunkPrefetch(router, { isAuthenticated: () => true })
      vi.runAllTimers()

      expect(loadRouteChunk).not.toHaveBeenCalled()
    }
  )

  it('keeps console navigation warming available within the console', async () => {
    vi.useFakeTimers()
    const dashboard = { id: '/_authenticated/dashboard/' } as AnyRoute
    const loadRouteChunk = vi.fn().mockResolvedValue(undefined)
    const router = {
      state: { location: { pathname: '/wallet' } },
      routesById: { '/_authenticated/dashboard/': dashboard },
      loadRouteChunk,
    } as unknown as AnyRouter

    scheduleRouteChunkPrefetch(router, { isAuthenticated: () => true })
    await vi.runAllTimersAsync()

    expect(loadRouteChunk).toHaveBeenCalledWith(dashboard)
  })
})
