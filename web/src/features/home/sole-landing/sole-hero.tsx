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
import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Layers,
  MessageCircle,
  Radio,
  Menu,
  X,
  Terminal,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BrandWordmark } from '@/components/brand-wordmark'
import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@/components/ui/dialog'
import { getLobeIcon } from '@/lib/lobe-icon'

import type { SoleLandingProps } from '.'
import { SoleActions } from './sole-actions'

const providers = [
  { name: 'OpenAI', icon: 'OpenAI' },
  { name: 'Claude', icon: 'Claude.Color' },
  { name: 'DeepSeek', icon: 'DeepSeek.Color' },
  { name: 'Qwen', icon: 'Qwen.Color' },
  { name: 'Kimi', icon: 'Moonshot' },
  { name: 'GLM', icon: 'Zhipu.Color' },
  { name: 'MiniMax', icon: 'Minimax.Color' },
]

export function SoleHero(props: SoleLandingProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 12)
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || typeof IntersectionObserver === 'undefined') return
    let inView = true
    const updateVisibility = () => {
      hero.dataset.motionPaused = String(document.hidden || !inView)
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      updateVisibility()
    })
    observer.observe(hero)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])
  const endpoint = `${props.serverAddress.replace(/\/+$/, '')}/v1/chat/completions`
  const request = `curl ${endpoint} \\\n  -H "Authorization: Bearer $AIMOXT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"Hello"}]}'`

  return (
    <>
      <a className='sole-skip-link' href='#sole-main'>
        {t('Skip to content')}
      </a>
      <header className='sole-header' data-scrolled={scrolled}>
        <div className='sole-header-inner'>
          <Link to='/' className='sole-brand' aria-label={t('AIMOXT home')}>
            <BrandWordmark />
          </Link>
          <nav className='sole-nav' aria-label={t('Main navigation')}>
            {props.actions.pricingEnabled && (
              <Link to='/pricing'>{t('Models')}</Link>
            )}
            <a href='#capabilities'>{t('Capabilities')}</a>
            <a href='#integration'>{t('Documentation')}</a>
            <Link to='/chat'>{t('Online AI chat')}</Link>
            <Link to='/canvas'>{t('Image creation canvas')}</Link>
            <a
              href='https://t.me/moiusr'
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('Contact')}
            </a>
          </nav>
          <div className='sole-header-controls'>
            <LanguageSwitcher />
            <ThemeSwitch />
            <div className='sole-desktop-action'>
              <SoleActions actions={props.actions} compact />
            </div>
            <Dialog
              title={t('Explore AIMOXT')}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              contentClassName='sole-mobile-dialog'
              showCloseButton={false}
              trigger={
                <Button
                  variant='ghost'
                  size='icon'
                  className='sole-menu-trigger'
                  aria-label={t('Open navigation')}
                  aria-expanded={menuOpen}
                >
                  <Menu aria-hidden='true' />
                </Button>
              }
            >
              <DialogClose
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    className='sole-menu-close'
                    aria-label={t('Close navigation')}
                  />
                }
              >
                <X aria-hidden='true' />
              </DialogClose>
              <nav
                className='sole-mobile-links'
                aria-label={t('Mobile navigation')}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) {
                    setMenuOpen(false)
                  }
                }}
              >
                {props.actions.pricingEnabled && (
                  <Link to='/pricing'>{t('Models')}</Link>
                )}
                <a href='#capabilities'>{t('Capabilities')}</a>
                <a href='#integration'>{t('Documentation')}</a>
                <Link to='/chat'>
                  <MessageCircle aria-hidden='true' />
                  {t('Online AI chat')}
                  <ArrowUpRight aria-hidden='true' />
                </Link>
                <Link to='/canvas'>
                  <Layers aria-hidden='true' />
                  {t('Image creation canvas')}
                  <ArrowUpRight aria-hidden='true' />
                </Link>
                <a
                  href='https://t.me/moiusr'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {t('Contact')}
                  <ArrowUpRight aria-hidden='true' />
                </a>
              </nav>
              <SoleActions actions={props.actions} compact />
            </Dialog>
          </div>
        </div>
      </header>
      <section
        ref={heroRef}
        className='sole-hero'
        aria-labelledby='sole-hero-title'
      >
        <div className='sole-hero-stage'>
          <div className='sole-orbit sole-orbit-one' aria-hidden='true' />
          <div className='sole-orbit sole-orbit-two' aria-hidden='true' />
          <div
            className='sole-floating-logo sole-logo-openai'
            aria-hidden='true'
          >
            {getLobeIcon('OpenAI', 32)}
          </div>
          <div
            className='sole-floating-logo sole-logo-claude'
            aria-hidden='true'
          >
            {getLobeIcon('Claude.Color', 33)}
          </div>
          <div
            className='sole-floating-logo sole-logo-deepseek'
            aria-hidden='true'
          >
            {getLobeIcon('DeepSeek.Color', 38)}
          </div>
          <div className='sole-floating-logo sole-logo-qwen' aria-hidden='true'>
            {getLobeIcon('Qwen.Color', 33)}
          </div>
          <div className='sole-hero-copy'>
            <div className='sole-center-brand' aria-hidden='true'>
              <img src='/brand/symbol.svg' alt='' width='34' height='34' />
            </div>
            <a href='#capabilities' className='sole-eyebrow-pill'>
              <span className='sole-dot' />
              {t('Your next idea starts with one API.')}
              <ArrowUpRight aria-hidden='true' />
            </a>
            <h1 id='sole-hero-title'>
              <span className='sole-headline-first'>
                {t('One API for every idea.')}
              </span>
              <span className='sole-headline-second'>
                <span className='sole-headline-connect'>
                  {t('Connect to leading')}
                </span>{' '}
                <span className='sole-underlined'>{t('AI models.')}</span>
              </span>
            </h1>
            <p>
              {t('Connect your ideas to leading AI models.')}
              <br />
              {t('Build with a familiar API. Keep every request in view.')}
            </p>
            <SoleActions actions={props.actions} />
            <div className='sole-hero-tools sole-experience-tools'>
              <Link
                to='/chat'
                className='sole-experience-card sole-experience-chat'
              >
                <span className='sole-experience-icon'>
                  <MessageCircle aria-hidden='true' />
                </span>
                <span className='sole-experience-copy'>
                  <strong>{t('Online AI chat')}</strong>
                  <small>{t('Ask, write and code. No API key needed.')}</small>
                </span>
                <ArrowUpRight aria-hidden='true' />
              </Link>
              <Link
                to='/canvas'
                className='sole-experience-card sole-experience-canvas'
              >
                <span className='sole-experience-icon'>
                  <Layers aria-hidden='true' />
                </span>
                <span className='sole-experience-copy'>
                  <strong>{t('Image creation canvas')}</strong>
                  <small>{t('Upload images, arrange and annotate.')}</small>
                </span>
                <ArrowUpRight aria-hidden='true' />
              </Link>
            </div>
            <div className='sole-hero-note'>
              <Check aria-hidden='true' />
              {t('Use your existing SDK. Choose models from the live catalog.')}
            </div>
          </div>
          <div className='sole-glass sole-model-widget'>
            <div className='sole-widget-heading'>
              <span>{t('Model playground')}</span>
              <span className='sole-demo'>{t('Demo')}</span>
            </div>
            {providers.slice(0, 3).map((provider) => (
              <div className='sole-model-row' key={provider.name}>
                <span className='sole-model-icon' aria-hidden='true'>
                  {getLobeIcon(provider.icon, 20)}
                </span>
                <span>{provider.name}</span>
                <span className='sole-model-chip'>{t('API')}</span>
              </div>
            ))}
            <div className='sole-widget-foot'>
              {t('Availability follows the model catalog')}
              <ArrowUpRight aria-hidden='true' />
            </div>
          </div>
          <div className='sole-glass sole-route-widget'>
            <div className='sole-widget-heading'>
              <span>
                <Radio aria-hidden='true' />
                {t('Request routing')}
              </span>
              <span className='sole-demo'>{t('Demo')}</span>
            </div>
            <div className='sole-route-row'>
              <span className='sole-dot' />
              <span>{t('Application')}</span>
              <span className='sole-route-line' />
              <span className='sole-route-node'>AIMOXT</span>
            </div>
            <div className='sole-route-branches'>
              <span>{t('Primary channel')}</span>
              <span>{t('Backup channel')}</span>
            </div>
            <div className='sole-widget-foot'>
              <Check aria-hidden='true' />
              {t('Routing illustration, not live status')}
            </div>
          </div>
          <div className='sole-glass sole-code-widget'>
            <div className='sole-widget-heading'>
              <span>
                <Terminal aria-hidden='true' />
                first-request.sh
              </span>
              <CopyButton
                value={request}
                aria-label={t('Copy API request example')}
              />
            </div>
            <pre tabIndex={0} aria-label={t('API request example')}>
              <code>
                <span className='sole-code-purple'>curl </span>
                <span className='sole-code-green'>{endpoint}</span>
                {' \\\n'}
                {'  -H '}
                <span className='sole-code-amber'>
                  "Authorization: Bearer $AIMOXT_API_KEY"
                </span>
                {' \\\n'}
                {'  -H '}
                <span className='sole-code-amber'>
                  "Content-Type: application/json"
                </span>
                {' \\\n'}
                {'  -d '}
                <span className='sole-code-green'>{`'{"model":"YOUR_MODEL_ID",`}</span>
                {'\n'}
                <span className='sole-code-green'>{`    "messages":[{"role":"user","content":"Hello"}]}'`}</span>
              </code>
            </pre>
            <div className='sole-widget-foot'>
              {t('Example only. Replace the key and model ID.')}
            </div>
          </div>
          <div className='sole-glass sole-chart-widget'>
            <div className='sole-widget-heading'>
              <span>{t('Usage overview')}</span>
              <span className='sole-demo'>{t('Demo')}</span>
            </div>
            <div className='sole-chart-summary'>
              <span>{t('Requests over time')}</span>
              <span className='sole-chart-legend'>
                <i />
                {t('Illustration')}
              </span>
            </div>
            <svg
              viewBox='0 0 280 105'
              className='sole-chart'
              aria-hidden='true'
            >
              <defs>
                <linearGradient
                  id='sole-chart-fill'
                  x1='0'
                  x2='0'
                  y1='0'
                  y2='1'
                >
                  <stop offset='0%' stopColor='#5580ff' stopOpacity='.4' />
                  <stop offset='100%' stopColor='#5580ff' stopOpacity='0' />
                </linearGradient>
              </defs>
              <path
                className='sole-chart-grid'
                d='M0 25H280M0 55H280M0 85H280'
              />
              <path
                fill='url(#sole-chart-fill)'
                d='M0 91C20 88 23 78 40 77S62 84 80 66S103 70 120 54S146 59 160 39S187 45 201 30S226 35 241 17S265 18 280 9V105H0Z'
              />
              <path
                fill='none'
                stroke='#648bff'
                strokeWidth='2.5'
                className='sole-chart-line'
                pathLength='1'
                d='M0 91C20 88 23 78 40 77S62 84 80 66S103 70 120 54S146 59 160 39S187 45 201 30S226 35 241 17S265 18 280 9'
              />
            </svg>
            <div className='sole-widget-foot'>
              {t('Illustrative data. No performance claim.')}
            </div>
          </div>
          <a
            className='sole-scroll-hint'
            href='#capabilities'
            aria-label={t('Explore capabilities')}
          >
            <ArrowDown aria-hidden='true' />
          </a>
        </div>
        <div className='sole-provider-strip'>
          <p>{t('Familiar models. A connected workflow.')}</p>
          <div
            className='sole-marquee'
            tabIndex={0}
            role='region'
            aria-label={t('Model ecosystems')}
          >
            <div className='sole-marquee-track'>
              {[false, true].map((duplicate) => (
                <ul
                  key={String(duplicate)}
                  aria-hidden={duplicate || undefined}
                >
                  {providers.map((provider) => (
                    <li key={provider.name}>
                      <span aria-hidden='true'>
                        {getLobeIcon(provider.icon, 27)}
                      </span>
                      {provider.name}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <span className='sole-catalog-note'>
            {t(
              'Available models and protocols depend on the catalog and your access group.'
            )}
          </span>
        </div>
      </section>
    </>
  )
}
