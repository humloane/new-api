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
export const CHAT_FILE_ACCEPT =
  'image/png,image/jpeg,image/webp,text/plain,text/markdown,text/csv,application/json,.txt,.md,.csv,.json'
export const CHAT_FILE_LIMIT = 4
export const CHAT_ATTACHMENT_ERROR =
  'Choose up to 4 PNG, JPEG, WebP or text files. Images must be under 5 MB and text files under 256 KB.'

export type ChatAttachment = {
  filename: string
  mediaType: string
  content: string
}

/** Read only bounded local files. Never fetch a URL supplied by the user. */
export async function prepareChatAttachment(
  file: File
): Promise<ChatAttachment> {
  const image = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
  const text =
    ['text/plain', 'text/markdown', 'text/csv', 'application/json'].includes(
      file.type
    ) ||
    (!file.type && /\.(txt|md|csv|json)$/i.test(file.name))
  if (
    (!image && !text) ||
    file.size === 0 ||
    file.size > (image ? 5 * 1024 * 1024 : 256 * 1024)
  ) {
    throw new Error(CHAT_ATTACHMENT_ERROR)
  }
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener(
      'error',
      () =>
        reject(new Error('Could not read the attachment. Please try again.')),
      { once: true }
    )
    reader.addEventListener('load', () => resolve(String(reader.result)), {
      once: true,
    })
    if (image) reader.readAsDataURL(file)
    else reader.readAsText(file, 'UTF-8')
  })
  if (image) {
    const base64 = content.slice(content.indexOf(',') + 1)
    const signature = atob(base64.slice(0, 32))
    const png =
      file.type === 'image/png' && signature.startsWith('\x89PNG\r\n\x1a\n')
    const jpeg =
      file.type === 'image/jpeg' && signature.startsWith('\xff\xd8\xff')
    const webp =
      file.type === 'image/webp' &&
      signature.startsWith('RIFF') &&
      signature.slice(8, 12) === 'WEBP'
    if (!png && !jpeg && !webp) throw new Error(CHAT_ATTACHMENT_ERROR)
  } else if (content.includes('\0') || content.includes('\ufffd')) {
    throw new Error('Text attachments must contain valid UTF-8 text.')
  }
  return {
    filename: file.name,
    mediaType: image ? file.type : 'text/plain',
    content,
  }
}

export function getChatAttachmentText(
  text: string,
  attachments: ChatAttachment[]
): string {
  return [
    text.trim(),
    ...attachments
      .filter((file) => file.mediaType === 'text/plain')
      .map((file) => `--- ${file.filename} ---\n${file.content}\n---`),
  ]
    .filter(Boolean)
    .join('\n\n')
}
