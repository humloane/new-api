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

export function SoleActions(props: {
  actions: LandingActions
  compact?: boolean
}) {
  const { t } = useTranslation()
  let target = '/sign-in'
  let label = t('Sign in')
  if (props.actions.isAuthenticated) {
    target = '/dashboard'
    label = t('Go to Dashboard')
  } else if (props.actions.registrationEnabled) {
    target = '/sign-up'
    label = t('Get API access')
  }

  return (
    <div className='sole-actions'>
      <Button
        role='link'
        className='sole-button sole-button-primary'
        render={<Link to={target} />}
      >
        {label}
        <ArrowRight aria-hidden='true' />
      </Button>
      {!props.compact && props.actions.pricingEnabled && (
        <Button
          role='link'
          variant='outline'
          className='sole-button sole-button-secondary'
          render={<Link to='/pricing' />}
        >
          <BookOpen aria-hidden='true' />
          {props.actions.pricingRequiresAuth
            ? t('Sign in to view pricing')
            : t('Explore models')}
        </Button>
      )}
    </div>
  )
}
