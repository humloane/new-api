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
import { ArrowUp, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ChatComposer(props: {
  draft: string
  onDraftChange: (draft: string) => void
  onSubmit: () => void
  isGenerating: boolean
  onStop: () => void
}) {
  const { t } = useTranslation()
  return (
    <form
      className='workbench-composer'
      onSubmit={(event) => {
        event.preventDefault()
        props.onSubmit()
      }}
    >
      <Textarea
        aria-label={t('Message the assistant')}
        placeholder={t('Ask anything, or turn an idea into something real...')}
        value={props.draft}
        onChange={(event) => props.onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            if (!props.isGenerating) props.onSubmit()
          }
        }}
        disabled={props.isGenerating}
      />
      <div className='workbench-composer-footer'>
        <span>{t('Shift + Enter for a new line')}</span>
        {props.isGenerating ? (
          <Button
            type='button'
            onClick={props.onStop}
            aria-label={t('Stop generation')}
            className='workbench-send'
            size='icon'
          >
            <Square aria-hidden='true' />
          </Button>
        ) : (
          <Button
            type='submit'
            disabled={!props.draft.trim()}
            aria-label={t('Send message')}
            className='workbench-send'
            size='icon'
          >
            <ArrowUp aria-hidden='true' />
          </Button>
        )}
      </div>
    </form>
  )
}
