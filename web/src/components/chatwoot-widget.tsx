import { useEffect } from 'react'

const CHATWOOT_BASE_URL = 'https://chat.yihec.com'
const CHATWOOT_WEBSITE_TOKEN = 'LPmK1FUVtc4JxNePGU8UEGzj'

declare global {
  interface Window {
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string }) => void
    }
    chatwootSettings?: Record<string, unknown>
    $chatwoot?: { toggle: (state?: string) => void }
  }
}

/**
 * Loads the Chatwoot website widget on public pages.
 *
 * New API does not expose a safe executable-script field in the admin UI, so
 * the public website token lives here. Replace the two constants to point at a
 * different Chatwoot inbox.
 */
export function ChatwootWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    window.chatwootSettings = {
      position: 'right',
      type: 'standard',
      launcherTitle: '',
    }

    if (document.querySelector('script[data-aimoxt-chatwoot]')) return

    let cancelled = false
    const load = () => {
      if (cancelled) return
      const script = document.createElement('script')
      script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
      script.async = true
      script.defer = true
      script.dataset.aimoxtChatwoot = 'true'
      script.onload = () => {
        window.chatwootSDK?.run({
          websiteToken: CHATWOOT_WEBSITE_TOKEN,
          baseUrl: CHATWOOT_BASE_URL,
        })
      }
      document.body.appendChild(script)
    }

    // The support widget is not needed for the first paint. Loading it during
    // idle time keeps its SDK, iframe and websocket from competing with the
    // page the visitor is waiting for.
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number }
      ) => number
      cancelIdleCallback?: (handle: number) => void
    }
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(load, { timeout: 3000 })
      return () => {
        cancelled = true
        idleWindow.cancelIdleCallback?.(handle)
      }
    }

    const timer = window.setTimeout(load, 2500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
