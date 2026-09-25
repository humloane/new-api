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
import { ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import type { LandingActions } from '../types'

export function HeroButtons(props: LandingActions) {
  const { t } = useTranslation()
  let primaryHref = '/sign-in'
  let primaryLabel = t('Sign in')
  if (props.isAuthenticated) {
    primaryHref = '/dashboard'
    primaryLabel = t('Go to Dashboard')
  } else if (props.registrationEnabled) {
    primaryHref = '/sign-up'
    primaryLabel = t('Get API access')
  }

  return (
    <>
      <Button
        role='link'
        size='lg'
        className='landing-primary-action h-12 rounded-lg bg-violet-700 px-6 text-white hover:bg-violet-800 dark:bg-violet-400 dark:text-slate-950 dark:hover:bg-violet-300'
        render={<Link to={primaryHref} />}
      >
        {primaryLabel}
        <ArrowRight aria-hidden='true' className='size-4' />
      </Button>
      {props.pricingEnabled && (
        <Button
          role='link'
          size='lg'
          variant='outline'
          className='h-12 rounded-lg px-5'
          render={<Link to='/pricing' />}
        >
          {props.pricingRequiresAuth
            ? t('Sign in to view pricing')
            : t('Models & pricing')}
        </Button>
      )}
      {props.docsUrl && (
        <Button
          role='link'
          variant='ghost'
          className='h-11 rounded-xl'
          render={
            props.docsUrl.startsWith('http') ? (
              <a
                href={props.docsUrl}
                target='_blank'
                rel='noopener noreferrer'
              />
            ) : (
              <Link to={props.docsUrl} />
            )
          }
        >
          <BookOpen aria-hidden='true' className='size-4' />
          {t('Docs')}
        </Button>
      )}
    </>
  )
}
