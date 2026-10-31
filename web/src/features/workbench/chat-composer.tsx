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
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputProvider,
  PromptInputTextarea,
  usePromptInputController,
} from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'

import {
  CHAT_ATTACHMENT_ERROR,
  CHAT_FILE_ACCEPT,
  CHAT_FILE_LIMIT,
  prepareChatAttachment,
  type ChatAttachment,
} from './chat-attachments'

type ChatComposerProps = {
  draft: string
  onDraftChange: (draft: string) => void
  onSubmit: (attachments: ChatAttachment[]) => boolean
  isGenerating: boolean
  onStop: () => void
  supportsImages?: boolean
  anonymous?: boolean
}

export function ChatComposer(props: ChatComposerProps) {
  return (
    <PromptInputProvider initialInput={props.draft}>
      <ChatComposerInput {...props} />
    </PromptInputProvider>
  )
}

function ChatComposerInput(props: ChatComposerProps) {
  const { t } = useTranslation()
  const controller = usePromptInputController()
  const attachments = controller.attachments
  const inputRef = useRef<HTMLInputElement>(null)
  const prepared = useRef(new Map<string, ChatAttachment>())
  const urls = useRef<string[]>([])
  const mounted = useRef(true)
  const reading = useRef(false)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')
  const setInput = controller.textInput.setInput

  useEffect(() => setInput(props.draft), [props.draft, setInput])
  useEffect(() => {
    urls.current = attachments.files.map((file) => file.url)
    const names = new Set(attachments.files.map((file) => file.filename))
    for (const name of prepared.current.keys()) {
      if (!names.has(name)) prepared.current.delete(name)
    }
  }, [attachments.files])
  useEffect(() => {
    mounted.current = true
    const cache = prepared.current
    return () => {
      mounted.current = false
      for (const url of urls.current) URL.revokeObjectURL(url)
      cache.clear()
    }
  }, [])

  async function addFiles(files: File[]): Promise<void> {
    if (props.isGenerating || reading.current) return
    if (attachments.files.length + files.length > CHAT_FILE_LIMIT) {
      setError(CHAT_ATTACHMENT_ERROR)
      return
    }
    reading.current = true
    setIsReading(true)
    setError('')
    try {
      // Validate the whole batch before creating previews or retaining content.
      const batch = await Promise.all(files.map(prepareChatAttachment))
      if (!mounted.current) return
      const unique = files.filter(
        (file, index) =>
          !prepared.current.has(file.name) &&
          files.findIndex((other) => other.name === file.name) === index
      )
      for (const file of batch) {
        if (!prepared.current.has(file.filename)) {
          prepared.current.set(file.filename, file)
        }
      }
      attachments.add(unique)
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : CHAT_ATTACHMENT_ERROR)
      }
    } finally {
      reading.current = false
      if (mounted.current) setIsReading(false)
    }
  }

  return (
    <form
      className='workbench-composer'
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return
        event.preventDefault()
        void addFiles([...event.dataTransfer.files])
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (props.isGenerating || reading.current) return
        const files = attachments.files.map((file) =>
          prepared.current.get(file.filename ?? '')
        )
        if (files.some((file) => !file)) return
        if (props.onSubmit(files as ChatAttachment[])) {
          attachments.clear()
          prepared.current.clear()
          setError('')
        }
      }}
    >
      <input
        ref={inputRef}
        type='file'
        className='hidden'
        aria-label={t('Upload files')}
        accept={CHAT_FILE_ACCEPT}
        multiple
        disabled={props.isGenerating || isReading}
        onChange={(event) => {
          const files = [...(event.currentTarget.files ?? [])]
          event.currentTarget.value = ''
          void addFiles(files)
        }}
      />
      <div className='flex flex-wrap gap-2 px-3 pt-2'>
        <PromptInputAttachments>
          {(file) => (
            <PromptInputAttachment data={file} className='max-w-full' />
          )}
        </PromptInputAttachments>
      </div>
      <PromptInputTextarea
        aria-label={t('Message the assistant')}
        placeholder={t('Ask anything, or turn an idea into something real...')}
        onChange={(event) => props.onDraftChange(event.target.value)}
        onPaste={(event) => {
          const files = [...event.clipboardData.items]
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null)
          if (!files.length) return
          event.preventDefault()
          void addFiles(files)
        }}
        disabled={props.isGenerating}
      />
      {error && (
        <p role='alert' className='text-destructive px-3 text-sm'>
          {t(error)}
        </p>
      )}
      <div className='workbench-composer-footer'>
        <div className='text-muted-foreground flex min-w-0 items-center gap-2 text-xs'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={t('Attach')}
            disabled={props.isGenerating || isReading}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip aria-hidden='true' />
          </Button>
          <span>
            {isReading
              ? t('Reading attachments...')
              : t('Shift + Enter for a new line')}
          </span>
        </div>
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
            disabled={
              isReading || (!props.draft.trim() && !attachments.files.length)
            }
            aria-label={t('Send message')}
            className='workbench-send'
            size='icon'
          >
            <ArrowUp aria-hidden='true' />
          </Button>
        )}
      </div>
      <p className='text-muted-foreground px-3 pb-2 text-xs'>
        {t(
          'Attach PNG, JPEG, WebP or UTF-8 text files. Images require explicit model support. Attachments stay in this page and are cleared when your account changes.'
        )}
      </p>
    </form>
  )
}
