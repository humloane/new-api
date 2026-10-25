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
    if (document.querySelector('script[data-aimoxt-chatwoot]')) return

    window.chatwootSettings = {
      position: 'right',
      type: 'expanded',
      launcherTitle: '在线客服',
    }

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
  }, [])

  return null
}
