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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStreamRequest } from '@/features/playground/hooks/use-stream-request'
import {
  applyStreamingChunk,
  completeAssistantMessage,
  updateAssistantMessageWithError,
  updateLastAssistantMessage,
} from '@/features/playground/lib'
import type {
  ChatCompletionRequest,
  Message,
} from '@/features/playground/types'
import { handleServerError } from '@/lib/handle-server-error'

// The shared chat handler builds string-only messages. Reuse its stream transport
// and message reducers for the workbench's explicit image content parts.
export function useImageChat(
  updateMessages: (updater: (previous: Message[]) => Message[]) => void
) {
  const { t } = useTranslation()
  const { sendStreamRequest, stopStream } = useStreamRequest()
  const [isGenerating, setGenerating] = useState(false)
  const generation = useRef(0)
  useEffect(
    () => () => {
      generation.current += 1
    },
    []
  )

  const send = useCallback(
    (payload: ChatCompletionRequest) => {
      const current = ++generation.current
      setGenerating(true)
      void sendStreamRequest(
        { ...payload, stream: true },
        (type, chunk) => {
          if (current !== generation.current) return
          updateMessages((previous) =>
            updateLastAssistantMessage(previous, (message) =>
              applyStreamingChunk(message, type, chunk)
            )
          )
        },
        () => {
          if (current !== generation.current) return
          setGenerating(false)
          updateMessages((previous) =>
            updateLastAssistantMessage(previous, completeAssistantMessage)
          )
        },
        (error, code) => {
          if (current !== generation.current) return
          setGenerating(false)
          handleServerError(new Error(error))
          updateMessages((previous) =>
            updateAssistantMessageWithError(
              previous,
              error,
              code,
              t('API request error')
            )
          )
        }
      )
    },
    [sendStreamRequest, updateMessages, t]
  )

  const stop = useCallback(() => {
    generation.current += 1
    stopStream()
    setGenerating(false)
    updateMessages((previous) =>
      updateLastAssistantMessage(previous, completeAssistantMessage)
    )
  }, [stopStream, updateMessages])

  return { send, stop, isGenerating }
}
