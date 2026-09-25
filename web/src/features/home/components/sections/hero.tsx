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
import { ArrowDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSystemConfig } from '@/hooks/use-system-config'

import type { LandingActions } from '../../types'
import { HeroButtons } from '../hero-buttons'
import { ModelIllustration } from '../landing-illustrations'

interface HeroProps {
  actions: LandingActions
  serverAddress: string
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()

  return (
    <section aria-labelledby='landing-title' className='landing-hero'>
      <div className='landing-container landing-hero-grid'>
        <div className='landing-hero-copy'>
          <p className='landing-eyebrow'>
            {systemName} / {t('AI API access for developers')}
          </p>
          <h1 id='landing-title'>
            {t('AI model APIs,')}
            <br />
            <span>{t('one integration.')}</span>
          </h1>
          <p className='landing-hero-description'>
            {t(
              'Connect your applications to AI models through one gateway. Choose a model, get an API key, and keep usage in view.'
            )}
          </p>
          <div className='landing-actions'>
            <HeroButtons {...props.actions} />
          </div>
          <ul className='landing-hero-hints'>
            {[
              t('Compatible protocols'),
              t('Self-service API keys'),
              t('Usage visibility'),
            ].map((label) => (
              <li key={label}>
                <Check aria-hidden='true' />
                {label}
              </li>
            ))}
          </ul>
          <a href='#getting-started' className='landing-text-link'>
            {t('Three steps to get started')}
            <ArrowDown aria-hidden='true' />
          </a>
        </div>
        <ModelIllustration />
      </div>
    </section>
  )
}
