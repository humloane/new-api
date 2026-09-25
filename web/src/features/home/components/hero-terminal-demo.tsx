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
import { Pause, Play, Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeBlockFrame } from '@/components/ai-elements/code-block'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_DEMOS = [
  {
    id: 'chat',
    label: 'Chat',
    endpoint: '/v1/chat/completions',
    header: 'Authorization: Bearer $API_KEY',
    body: '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"Hello"}]}',
  },
  {
    id: 'responses',
    label: 'Responses',
    endpoint: '/v1/responses',
    header: 'Authorization: Bearer $API_KEY',
    body: '{"model":"YOUR_MODEL_ID","input":"Hello"}',
  },
  {
    id: 'messages',
    label: 'Claude',
    endpoint: '/v1/messages',
    header: 'x-api-key: $API_KEY',
    extraHeader: 'anthropic-version: 2023-06-01',
    body: '{"model":"YOUR_MODEL_ID","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    endpoint: '/v1beta/models/YOUR_MODEL_ID:generateContent',
    header: 'x-goog-api-key: $API_KEY',
    body: '{"contents":[{"parts":[{"text":"Hello"}]}]}',
  },
] as const

interface HeroTerminalDemoProps {
  serverAddress: string
}

export function HeroTerminalDemo(props: HeroTerminalDemoProps) {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setReducedMotion(media.matches)
    syncMotion()
    media.addEventListener('change', syncMotion)
    return () => media.removeEventListener('change', syncMotion)
  }, [])

  useEffect(() => {
    if (paused || reducedMotion) return
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % API_DEMOS.length)
    }, 4500)
    return () => window.clearInterval(interval)
  }, [paused, reducedMotion])

  return (
    <div className='bg-background min-w-0 rounded-2xl border border-blue-500/15 shadow-xl shadow-blue-950/10 dark:bg-slate-950/60 dark:shadow-black/20'>
      <div className='border-border/60 flex items-center justify-between gap-3 border-b px-5 py-4'>
        <div className='flex items-center gap-2 text-xs font-medium'>
          <Terminal
            aria-hidden='true'
            className='size-4 text-blue-600 dark:text-blue-400'
          />
          {t('Your first API call')}
        </div>
        <span className='text-muted-foreground rounded-full border px-2 py-1 text-[10px]'>
          {t('Code example')}
        </span>
      </div>
      <Tabs
        value={API_DEMOS[activeIndex].id}
        onValueChange={(value) => {
          const index = API_DEMOS.findIndex((demo) => demo.id === value)
          if (index < 0) return
          setActiveIndex(index)
          setPaused(true)
        }}
        className='gap-0'
      >
        <div className='bg-muted/20 flex items-center gap-1 border-b px-3 py-2'>
          <TabsList
            aria-label={t('API protocol')}
            variant='line'
            className='min-w-0 flex-1'
            onFocusCapture={() => setPaused(true)}
          >
            {API_DEMOS.map((demo) => (
              <TabsTrigger
                key={demo.id}
                value={demo.id}
                className='px-2 text-xs'
              >
                {demo.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {!reducedMotion && (
            <Button
              size='icon'
              variant='ghost'
              className='size-8 shrink-0'
              onClick={() => setPaused(!paused)}
              aria-label={paused ? t('Resume examples') : t('Pause examples')}
            >
              {paused ? (
                <Play aria-hidden='true' className='size-3.5' />
              ) : (
                <Pause aria-hidden='true' className='size-3.5' />
              )}
            </Button>
          )}
        </div>
        {API_DEMOS.map((demo) => {
          const address = props.serverAddress
            .replace(/\/+$/, '')
            .replaceAll("'", "'\"'\"'")
          const command = [
            `API_BASE_URL='${address}'`,
            '',
            `curl "\${API_BASE_URL}${demo.endpoint}" \\`,
            `  -H "${demo.header}" \\`,
            ...('extraHeader' in demo ? [`  -H "${demo.extraHeader}" \\`] : []),
            '  -H "Content-Type: application/json" \\',
            `  -d '${JSON.stringify(JSON.parse(demo.body), null, 2)}'`,
          ].join('\n')
          return (
            <TabsContent
              key={demo.id}
              value={demo.id}
              className='min-w-0 px-4 pt-4 pb-3'
              onFocusCapture={() => setPaused(true)}
              onMouseEnter={() => setPaused(true)}
            >
              <CodeBlockFrame
                showToolbar
                title='cURL'
                className='m-0 rounded-xl shadow-none'
                bodyClassName='h-64 p-4'
                endActions={
                  <CopyButton
                    value={command}
                    size='sm'
                    tooltip={t('Copy code')}
                    aria-label={t('Copy code')}
                  />
                }
              >
                <pre
                  className='min-w-0 font-mono text-xs leading-6 text-blue-900 dark:text-blue-100'
                  tabIndex={0}
                  aria-label={t('Code example')}
                >
                  <code>{command}</code>
                </pre>
              </CodeBlockFrame>
            </TabsContent>
          )
        })}
      </Tabs>
      <p className='text-muted-foreground px-5 pb-5 text-xs leading-5'>
        {t(
          'Set API_KEY in your environment and replace YOUR_MODEL_ID with a model from the catalog. Examples do not send requests.'
        )}
      </p>
    </div>
  )
}
