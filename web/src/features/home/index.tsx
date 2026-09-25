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
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { RichContent } from '@/components/rich-content'
import { useTheme } from '@/context/theme-provider'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { toIntlLocale } from '@/i18n/languages'
import { isLikelyHtml } from '@/lib/content-format'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'
import { createWebsiteSchema, parseSiteOrigin } from '@/lib/site-seo'
import { useAuthStore } from '@/stores/auth-store'

import { CTA, Features, Hero, HowItWorks, Stats } from './components'
import { EcosystemTiles, PlatformBar } from './components/landing-illustrations'

import '@/styles/landing.css'
import {
  IntegrationGuide,
  LandingFAQ,
  ProtocolGuide,
  UseCases,
} from './components/sections/developer-guide'
import { useHomePageContent } from './hooks'
import type { LandingActions } from './types'

export function Home() {
  const { i18n, t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { resolvedTheme } = useTheme()
  const isAuthenticated = useAuthStore((state) => !!state.auth.user)
  const { status } = useStatus()
  const { systemName } = useSystemConfig()
  const { content, isLoaded, isUrl } = useHomePageContent()

  const syncIframePreferences = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { themeMode: resolvedTheme },
        '*'
      )
      iframeRef.current?.contentWindow?.postMessage(
        { lang: i18n.language },
        '*'
      )
    } catch {
      // Cross-origin frames may reject access while navigating.
    }
  }, [i18n.language, resolvedTheme])

  useEffect(() => {
    if (isUrl) {
      syncIframePreferences()
    }
  }, [isUrl, syncIframePreferences])

  if (!isLoaded) {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='flex min-h-screen items-center justify-center'>
          <div className='text-muted-foreground'>{t('Loading...')}</div>
        </main>
      </PublicLayout>
    )
  }

  if (content) {
    if (isUrl) {
      return (
        <PublicLayout showMainContainer={false}>
          {/*
            allow-top-navigation-by-user-activation: the custom home page URL is
            admin-configured (trusted); this lets its target="_top" nav/menu links
            navigate the top-level window on user click. The default sandbox blocks
            this on desktop, while some mobile browsers allow it via allow-popups,
            causing inconsistent behavior. This token only permits user-activated
            top-level navigation and does NOT grant same-origin access.
          */}
          <iframe
            ref={iframeRef}
            src={content}
            className='h-screen w-full border-none'
            title={t('Custom Home Page')}
            sandbox='allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation'
            onLoad={syncIframePreferences}
          />
        </PublicLayout>
      )
    }

    const contentIsHtml = isLikelyHtml(content)

    if (contentIsHtml) {
      return (
        <PublicLayout showMainContainer={false}>
          <RichContent
            mode='html'
            htmlVariant='isolated'
            content={content}
            className='custom-home-content'
          />
        </PublicLayout>
      )
    }

    return (
      <PublicLayout>
        <div className='mx-auto max-w-6xl px-4 py-8'>
          <RichContent
            mode='markdown'
            content={content}
            className='custom-home-content'
          />
        </div>
      </PublicLayout>
    )
  }

  const modules = parseHeaderNavModulesFromStatus(status)
  const actions: LandingActions = {
    isAuthenticated,
    registrationEnabled: status?.register_enabled !== false,
    pricingEnabled: modules.pricing.enabled,
    pricingRequiresAuth: modules.pricing.requireAuth && !isAuthenticated,
    docsUrl: modules.docs
      ? (typeof status?.docs_link === 'string' && status.docs_link.trim()) ||
        'https://docs.newapi.pro'
      : undefined,
  }
  const serverAddress =
    (typeof status?.server_address === 'string' &&
      status.server_address.trim()) ||
    window.location.origin

  const schema = createWebsiteSchema(
    parseSiteOrigin(import.meta.env.VITE_PUBLIC_SITE_URL),
    systemName,
    toIntlLocale(i18n.resolvedLanguage || i18n.language) || 'en'
  )

  return (
    <PublicLayout
      showMainContainer={false}
      headerProps={{ appearance: 'landing' }}
    >
      {schema && <script type='application/ld+json'>{schema}</script>}
      <main className='aimoxt-landing'>
        <Hero actions={actions} serverAddress={serverAddress} />
        <PlatformBar />
        <UseCases />
        <EcosystemTiles />
        <Features />
        <HowItWorks />
        <ProtocolGuide />
        <IntegrationGuide serverAddress={serverAddress} />
        <LandingFAQ />
        <CTA actions={actions} />
        <Stats />
      </main>
      <Footer
        appearance='landing'
        columns={[
          {
            title: t('Compatible ecosystems'),
            links: [
              { text: 'OpenAI', href: '#protocols' },
              { text: 'Claude', href: '#protocols' },
              { text: 'Gemini', href: '#protocols' },
              { text: 'DeepSeek', href: '#protocols' },
            ],
          },
          {
            title: t('Integration guide'),
            links: [
              {
                text: t('Three steps to get started'),
                href: '#getting-started',
              },
              { text: 'Base URL', href: '#integration' },
              { text: 'API Key', href: '#integration' },
              { text: t('Model ID'), href: '#integration' },
            ],
          },
          {
            title: t('FAQ'),
            links: [
              { text: t('FAQ'), href: '#faq' },
              { text: t('Use cases'), href: '#use-cases' },
              ...(actions.docsUrl
                ? [{ text: t('Docs'), href: actions.docsUrl }]
                : []),
              ...(actions.pricingEnabled
                ? [
                    {
                      text: actions.pricingRequiresAuth
                        ? t('Sign in to view pricing')
                        : t('Models & pricing'),
                      href: '/pricing',
                    },
                  ]
                : []),
            ],
          },
          {
            title: t('AIMOXT妙信AI'),
            links: [
              {
                text: 'GitHub',
                href: '/',
              },
              {
                text: t('footer.columns.about.links.aboutProject'),
                href: 'https://docs.newapi.pro/wiki/project-introduction/',
              },
            ],
          },
        ]}
      />
    </PublicLayout>
  )
}
