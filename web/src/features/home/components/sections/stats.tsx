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
import { Activity, KeyRound, Layers, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function Stats() {
  const { t } = useTranslation()
  const capabilities = [
    { icon: KeyRound, title: t('Self-service API keys') },
    { icon: Layers, title: t('Compatible protocols') },
    { icon: Radio, title: t('Streaming responses') },
    { icon: Activity, title: t('Usage visibility') },
  ]

  return (
    <div className='landing-container landing-capability-strip'>
      <ul
        aria-label={t('Core Features')}
        className='grid grid-cols-2 gap-x-4 gap-y-6 py-12 md:grid-cols-4'
      >
        {capabilities.map((capability) => (
          <li
            key={capability.title}
            className='flex items-center justify-center gap-2.5 text-xs font-medium sm:text-sm'
          >
            <capability.icon
              aria-hidden='true'
              className='text-muted-foreground size-4 shrink-0'
            />
            <span>{capability.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
