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
import { useEffect, useRef } from 'react'

import { Footer } from '@/components/layout/components/footer'

import type { LandingActions } from '../types'
import { SoleHero } from './sole-hero'
import { SoleSections } from './sole-sections'

import '@/styles/sole-landing.css'

export interface SoleLandingProps {
  actions: LandingActions
  serverAddress: string
}

/** A standalone public landing page; styles are scoped to this root. */
export function SoleLanding(props: SoleLandingProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (
      !root ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('sole-revealed')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.08 }
    )
    root
      .querySelectorAll(
        '.sole-section-heading, .sole-feature-card, .sole-compare-card, .sole-step, .sole-faq-intro, .sole-accordion, .sole-final-cta'
      )
      .forEach((element) => {
        element.classList.add('sole-reveal')
        observer.observe(element)
      })
    return () => observer.disconnect()
  }, [])
  return (
    <div className='sole-landing' ref={rootRef}>
      <SoleHero actions={props.actions} serverAddress={props.serverAddress} />
      <main id='sole-main'>
        <SoleSections actions={props.actions} />
      </main>
      <Footer
        appearance='landing'
        className='sole-footer'
        name='AIMOXT'
        logo='/brand/symbol.svg'
        columns={[
          {
            title: 'Build with AIMOXT',
            links: [
              { text: 'Models & pricing', href: '/pricing' },
              { text: 'Online AI chat', href: '/chat' },
              { text: 'Image creation canvas', href: '/canvas' },
            ],
          },
          {
            title: 'Resources',
            links: [
              { text: 'Quick start', href: '#integration' },
              { text: 'Frequently asked questions', href: '#faq' },
              { text: 'About AIMOXT', href: '/about' },
            ],
          },
          {
            title: 'Project',
            links: [
              {
                text: 'New API',
                href: 'https://github.com/QuantumNous/new-api',
              },
              { text: 'Contact us', href: 'https://t.me/moiusr' },
            ],
          },
        ]}
      />
    </div>
  )
}
