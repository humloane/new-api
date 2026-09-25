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
import {
  Activity,
  Braces,
  Code2,
  KeyRound,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LandingActions } from '../../types'
import { HeroButtons } from '../hero-buttons'

interface CTAProps {
  actions: LandingActions
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()
  const capabilities = [
    { icon: Braces, label: t('Compatible protocols') },
    { icon: KeyRound, label: t('Self-service API keys') },
    { icon: Code2, label: t('Keep your integration') },
    { icon: Layers, label: t('Beyond a single model') },
    { icon: Activity, label: t('Usage visibility') },
    { icon: ShieldCheck, label: t('Control your API access') },
  ]
  return (
    <section aria-labelledby='landing-cta' className='landing-cta'>
      <div className='landing-container landing-cta-grid'>
        <div className='landing-cta-copy'>
          <p className='landing-eyebrow'>{t('Start building')}</p>
          <h2 id='landing-cta' className='landing-section-title'>
            {t('Your next idea starts with an API call.')}
          </h2>
          <p className='landing-body'>
            {t(
              'Explore the catalog, connect your application, and manage access from one console.'
            )}
          </p>
          <div className='landing-actions'>
            <HeroButtons {...props.actions} />
          </div>
        </div>
        <ul className='landing-cta-capabilities'>
          {capabilities.map((capability) => (
            <li key={capability.label}>
              <capability.icon aria-hidden='true' />
              <span>{capability.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
