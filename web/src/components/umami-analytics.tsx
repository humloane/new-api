import { useEffect } from 'react'

const UMAMI_SCRIPT_URL = 'https://stats.yihec.com/script.js'
const UMAMI_WEBSITE_ID = '155f6968-fc91-47a8-9fc4-77b2ebd4e682'

/**
 * Loads the Umami analytics script on public/frontend pages.
 *
 * Admin and authenticated console layouts intentionally do not render this
 * component, so management traffic is not mixed into the public analytics.
 */
export function UmamiAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (document.querySelector('script[data-aimoxt-umami]')) return

    const script = document.createElement('script')
    script.src = UMAMI_SCRIPT_URL
    script.defer = true
    script.dataset.websiteId = UMAMI_WEBSITE_ID
    script.dataset.aimoxtUmami = 'true'
    document.body.appendChild(script)
  }, [])

  return null
}
