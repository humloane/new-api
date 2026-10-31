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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { RichContent } from '@/components/rich-content'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { formatDateTimeObject } from '@/lib/time'

import { getHomeAnnouncements } from './announcements'

export function HomeAnnouncements() {
  const { t } = useTranslation()
  const { status, loading, error, isPlaceholderData } = useStatus()
  const [pageReady, setPageReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const items = useMemo(
    () => getHomeAnnouncements(status?.announcements),
    [status?.announcements]
  )
  const eligible =
    !loading &&
    !isPlaceholderData &&
    !error &&
    status?.announcements_enabled === true &&
    items.length > 0

  useEffect(() => {
    let frame = 0
    const afterLoad = () => {
      // Two frames allow the loaded page to paint before opening a modal.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPageReady(true))
      })
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    return () => {
      window.removeEventListener('load', afterLoad)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!eligible || !pageReady || dismissed || scheduled) return
    let frame = 0
    const openWhenAvailable = () => {
      if (
        document.hidden ||
        document.querySelector(
          '[role="dialog"][data-open], [role="alertdialog"][data-open]'
        )
      ) {
        return
      }
      frame = requestAnimationFrame(() => setScheduled(true))
    }
    openWhenAvailable()
    const observer = new MutationObserver(openWhenAvailable)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-open'],
    })
    document.addEventListener('visibilitychange', openWhenAvailable)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', openWhenAvailable)
      cancelAnimationFrame(frame)
    }
  }, [eligible, pageReady, dismissed, scheduled])

  const open = eligible && pageReady && scheduled && !dismissed
  if (!eligible) return null
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true)
      }}
      title={t('Platform announcements')}
      description={t('Latest updates published by AIMOXT.')}
      contentClassName='sm:max-w-xl'
      bodyClassName='space-y-5'
      footer={<Button onClick={() => setDismissed(true)}>{t('Got it')}</Button>}
    >
      {items.map((item, index) => {
        const date = item.publishDate ? new Date(item.publishDate) : null
        return (
          <article
            key={item.id ?? index}
            className='border-border/60 space-y-2 border-b pb-5 last:border-0 last:pb-0'
          >
            {date && Number.isFinite(date.getTime()) && (
              <time
                className='text-muted-foreground text-xs'
                dateTime={date.toISOString()}
              >
                {formatDateTimeObject(date)}
              </time>
            )}
            <RichContent breaks content={item.content} />
            {typeof item.extra === 'string' && item.extra.trim() && (
              <RichContent
                breaks
                content={item.extra}
                className='text-muted-foreground text-sm'
              />
            )}
          </article>
        )
      })}
    </Dialog>
  )
}
