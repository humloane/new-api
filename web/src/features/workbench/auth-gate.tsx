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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import { SignUpForm } from '@/features/auth/sign-up/components/sign-up-form'
import { useStatus } from '@/hooks/use-status'

export function WorkbenchAuthGate(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectTo?: '/chat' | '/canvas'
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const registering = mode === 'sign-up' && status?.register_enabled !== false
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={
        registering
          ? t('Create your AIMOXT account')
          : t('Sign in to start chatting')
      }
      description={t(
        'Your draft is saved in this tab. Review it and send when you are ready after signing in.'
      )}
      contentClassName='workbench workbench-auth-dialog'
    >
      {registering && (
        <p className='rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200'>
          {t('Limited-time promotion')} ·{' '}
          {t('New users get ¥5 credit on sign-up')}
        </p>
      )}
      {registering ? (
        <SignUpForm onRegistered={() => setMode('sign-in')} />
      ) : (
        <UserAuthForm redirectTo={props.redirectTo ?? '/chat'} />
      )}
      {status?.register_enabled !== false && (
        <div className='workbench-auth-signup'>
          <span>
            {registering ? t('Already have an account?') : t('New to AIMOXT?')}
          </span>
          <Button
            variant='link'
            onClick={() => setMode(registering ? 'sign-in' : 'sign-up')}
          >
            {registering ? t('Sign in') : t('Create an account')}
          </Button>
        </div>
      )}
      <p className='workbench-auth-disclaimer'>
        {t(
          'Requests are charged from your current account balance at the selected price.'
        )}
      </p>
    </Dialog>
  )
}
