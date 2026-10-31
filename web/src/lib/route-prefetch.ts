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
 * Load the chunks a link points at as soon as the pointer touches it.
 *
 * This deliberately does not call `preloadRoute`: that also runs `beforeLoad`,
 * and a redirect thrown there during preload can leave the match pending and
 * make the following click look dead. Loading the chunk alone only needs the
 * match tree.
 */
export function installRouteChunkHoverPrefetch(router: AnyRouter): () => void {
  if (!shouldPrefetch()) return () => undefined

  const seen = new Set<string>()

  const handlePointerOver = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.hasAttribute('download')) return

    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return
    if (url.pathname === window.location.pathname) return
    if (seen.has(url.pathname)) return
    seen.add(url.pathname)

    try {
      const matches = router.matchRoutes(url.pathname)
      const routesById = router.routesById as Record<
        string,
        AnyRoute | undefined
      >
      for (const match of matches ?? []) {
        const route = routesById[match.routeId]
        if (!route) continue
        void Promise.resolve(router.loadRouteChunk(route)).catch(
          () => undefined
        )
      }
    } catch {
      // A link that does not resolve to a route is not this listener's problem.
    }
  }

  window.addEventListener('pointerover', handlePointerOver, {
    passive: true,
  })
  return () => window.removeEventListener('pointerover', handlePointerOver)
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

  // Public pages and the creative workbench should only fetch their own code.
  // A signed-in visitor is not necessarily visiting the console: warming its
  // dashboard/chart bundles here otherwise costs megabytes on /chat and /canvas.
  const pathname = router.state.location.pathname
  if (!/^\/(dashboard|wallet|keys|usage-logs)(\/|$)/.test(pathname)) return

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
