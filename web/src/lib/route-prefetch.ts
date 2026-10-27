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

/**
 * Warm the JavaScript chunks for the most-used pages after the first paint.
 *
 * Route components are code-split, so a cold click has to download the page
 * chunk before anything can render. Downloading those chunks during idle time
 * removes that wait without changing when a page actually mounts: this only
 * loads the route modules, it never runs `beforeLoad` or a loader, so no
 * authentication check, redirect, or request happens early.
 */
const AUTHENTICATED_ROUTES = [
  '/_authenticated/wallet/',
  '/_authenticated/dashboard/',
  '/_authenticated/keys/',
  '/_authenticated/usage-logs/',
] as const

const PUBLIC_ROUTES = ['/pricing/'] as const

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number
  cancelIdleCallback?: (handle: number) => void
}

function shouldPrefetch(): boolean {
  if (typeof window === 'undefined') return false
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (connection?.saveData) return false
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) {
    return false
  }
  return true
}

function whenIdle(callback: () => void): void {
  const idleWindow = window as IdleWindow
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(callback, { timeout: 2500 })
    return
  }
  window.setTimeout(callback, 1200)
}

/**
 * Queue chunk downloads one at a time so prefetching never competes with the
 * page the visitor is currently looking at.
 */
export function scheduleRouteChunkPrefetch(
  router: AnyRouter,
  options: { isAuthenticated: () => boolean }
): void {
  if (!shouldPrefetch()) return

  whenIdle(() => {
    const ids = options.isAuthenticated()
      ? [...AUTHENTICATED_ROUTES, ...PUBLIC_ROUTES]
      : [...PUBLIC_ROUTES]

    const queue = ids
      .map((id) => router.routesById[id] as AnyRoute | undefined)
      .filter((route): route is AnyRoute => Boolean(route))

    const loadNext = (index: number) => {
      const route = queue[index]
      if (!route) return
      let pending: Promise<void> | undefined
      try {
        pending = router.loadRouteChunk(route)
      } catch {
        pending = undefined
      }
      void Promise.resolve(pending)
        .catch(() => undefined)
        .then(() => {
          if (index + 1 >= queue.length) return
          window.setTimeout(() => loadNext(index + 1), 150)
        })
    }

    loadNext(0)
  })
}
