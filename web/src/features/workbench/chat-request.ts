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
  buildChatCompletionPayload,
  buildMessageContent,
  isValidMessage,
} from '@/features/playground/lib'
import type {
  Message,
  ParameterEnabled,
  PlaygroundConfig,
} from '@/features/playground/types'

import type { ChatAttachment } from './chat-attachments'

/** Keep the shared text message shape; attach images only at the API boundary. */
export function buildWorkbenchChatPayload(
  messages: Message[],
  config: PlaygroundConfig,
  parameters: ParameterEnabled,
  attachments: ReadonlyMap<string, ChatAttachment[]>
) {
  const payload = buildChatCompletionPayload(messages, config, parameters)
  const valid = messages.filter(isValidMessage)
  payload.messages = payload.messages.map((message, index) => ({
    ...message,
    content: buildMessageContent(
      typeof message.content === 'string' ? message.content : '',
      (attachments.get(valid[index].key) ?? [])
        .filter((file) => file.mediaType.startsWith('image/'))
        .map((file) => file.content)
    ),
  }))
  return payload
}
