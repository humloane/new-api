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
import { createFileRoute } from '@tanstack/react-router'
import { t } from 'i18next'

import { Home } from '@/features/home'
import { parseSiteOrigin, SITE_TITLE } from '@/lib/site-seo'

export const Route = createFileRoute('/')({
  head: () => {
    const title = `${SITE_TITLE} — ${t('AI model APIs, one integration')}`
    const description = t(
      'Explore AI API protocols, choose a model, configure your application and monitor usage with AIMOXT.'
    )
    const origin = parseSiteOrigin(import.meta.env.VITE_PUBLIC_SITE_URL)
    return {
      links: origin ? [{ rel: 'canonical', href: `${origin}/` }] : [],
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        ...(origin ? [{ property: 'og:url', content: `${origin}/` }] : []),
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    }
  },
  component: Home,
})
