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
import { useTranslation } from 'react-i18next'

import { LaptopIllustration } from '../landing-illustrations'

export function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    {
      num: '1',
      title: t('Create your account'),
      desc: t('Sign up or sign in to manage your API access in the console.'),
    },
    {
      num: '2',
      title: t('Choose a model and key'),
      desc: t(
        'Review available models and pricing, create an API key, and check your quota.'
      ),
    },
    {
      num: '3',
      title: t('Make your first request'),
      desc: t(
        'Configure your API endpoint, send a request, and review usage in the dashboard.'
      ),
    },
  ]

  return (
    <section
      id='getting-started'
      aria-labelledby='landing-steps'
      className='landing-container landing-editorial-row scroll-mt-24'
    >
      <LaptopIllustration />
      <div>
        <p className='landing-eyebrow'>{t('How It Works')}</p>
        <h2 id='landing-steps' className='landing-section-title'>
          {t('Three steps to get started')}
        </h2>
        <ol className='landing-steps flex flex-col'>
          {steps.map((step) => (
            <li key={step.num}>
              <span className='landing-step-number' aria-hidden='true'>
                {step.num}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
