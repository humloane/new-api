import { useEffect } from 'react'

const CHATWOOT_BASE_URL = 'https://chat.yihec.com'
const CHATWOOT_WEBSITE_TOKEN = 'LPmK1FUVtc4JxNePGU8UEGzj'

declare global {
  interface Window {
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string }) => void
    }
    chatwootSettings?: Record<string, unknown>
    $chatwoot?: {
      toggle: (state?: string) => void
      toggleBubbleVisibility?: (state: 'show' | 'hide') => void
    }
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

    let cancelled = false
    let script: HTMLScriptElement | null = null
    const show = () => {
      if (cancelled) return
      document.documentElement.removeAttribute('data-support-hidden')
      window.$chatwoot?.toggleBubbleVisibility?.('show')
    }
    const hide = () => {
      cancelled = true
      document.documentElement.setAttribute('data-support-hidden', '')
      window.$chatwoot?.toggle('close')
      window.$chatwoot?.toggleBubbleVisibility?.('hide')
      window.removeEventListener('chatwoot:ready', show)
      if (script && !window.$chatwoot) script.remove()
    }
    // The SDK appends its iframe outside React. Persist the hidden state across
    // navigation, including an iframe that finishes initializing after unmount.
    if (!document.querySelector('style[data-aimoxt-chatwoot]')) {
      const style = document.createElement('style')
      style.dataset.aimoxtChatwoot = 'true'
      style.textContent =
        'html[data-support-hidden] .woot--bubble-holder, html[data-support-hidden] .woot-widget-holder { display: none !important; }'
      document.head.appendChild(style)
    }
    show()
    window.addEventListener('chatwoot:ready', show)
    window.chatwootSettings = {
      position: 'right',
      type: 'standard',
      launcherTitle: '',
    }
    if (window.$chatwoot) return hide

    const load = () => {
      if (cancelled) return
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-aimoxt-chatwoot]'
      )
      if (existing) return
      script = document.createElement('script')
      script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
      script.async = true
      script.defer = true
      script.dataset.aimoxtChatwoot = 'true'
      script.addEventListener(
        'load',
        () => {
          if (cancelled) return
          window.chatwootSDK?.run({
            websiteToken: CHATWOOT_WEBSITE_TOKEN,
            baseUrl: CHATWOOT_BASE_URL,
          })
        },
        { once: true }
      )
      document.body.appendChild(script)
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number }
      ) => number
      cancelIdleCallback?: (handle: number) => void
    }
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(load, { timeout: 5000 })
      return () => {
        hide()
        idleWindow.cancelIdleCallback?.(handle)
      }
    }
    const timer = window.setTimeout(load, 3000)
    return () => {
      hide()
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
