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
  ArrowLeftRight,
  FileText,
  KeyRound,
  Layers,
  Route,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { ModelCards } from '../landing-illustrations'

export function Features() {
  const { t } = useTranslation()
  const features = [
    {
      icon: KeyRound,
      title: t('One key, one entry point'),
      description: t(
        'Manage API access in one place instead of maintaining separate credentials for every provider.'
      ),
      detail: 'Authorization: Bearer $API_KEY',
    },
    {
      icon: ArrowLeftRight,
      title: t('Keep your integration'),
      description: t(
        'Use compatible API routes with your existing tools. Choose the model and protocol that fit your workload.'
      ),
      detail: '/v1/chat/completions',
    },
    {
      icon: FileText,
      title: t('Know what you use'),
      description: t(
        'Check request logs, usage, and remaining quota in your dashboard. Review model pricing before you call.'
      ),
    },
    {
      icon: Route,
      title: t('Routing behind the scenes'),
      description: t(
        'The gateway supports channel routing and load balancing, keeping upstream configuration out of your application.'
      ),
    },
    {
      icon: Layers,
      title: t('Beyond a single model'),
      description: t(
        'Explore text and multimodal APIs in the catalog. Supported inputs and features vary by model.'
      ),
    },
    {
      icon: ShieldCheck,
      title: t('Control your API access'),
      description: t(
        'Create separate keys for your applications and manage their limits and permissions from the console.'
      ),
    },
  ]

  return (
    <section
      aria-labelledby='landing-features'
      className='landing-container landing-feature-section'
    >
      <h2 id='landing-features' className='landing-section-title text-center'>
        {t('Less integration work. More building.')}
      </h2>
      <div className='landing-feature-panel'>
        <div>
          <p className='landing-eyebrow'>{t('Built for developers')}</p>
          <Accordion>
            {features.map((feature, index) => (
              <AccordionItem key={feature.title} value={`capability-${index}`}>
                <AccordionTrigger className='py-3 text-sm font-semibold'>
                  <span className='flex items-center gap-3'>
                    <feature.icon
                      aria-hidden='true'
                      className='size-4 shrink-0'
                    />
                    {feature.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  keepMounted
                  className='text-muted-foreground pb-3 text-sm leading-6'
                >
                  {feature.description}
                  {feature.detail && (
                    <code className='mt-2 block text-xs break-all'>
                      {feature.detail}
                    </code>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <ModelCards />
      </div>
      <p className='landing-feature-attribution'>
        {t(
          'Supports one-click configuration and perfectly adapts to NewAPI multi-protocol configuration.'
        )}
      </p>
    </section>
  )
}
