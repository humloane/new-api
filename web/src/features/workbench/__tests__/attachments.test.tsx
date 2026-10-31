import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { DEFAULT_CONFIG } from '@/features/playground/constants'
import { appendUserMessagePair } from '@/features/playground/lib'

import { prepareChatAttachment, type ChatAttachment } from '../chat-attachments'
import { ChatComposer } from '../chat-composer'
import { buildWorkbenchChatPayload } from '../chat-request'

const png = new File(
  [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])],
  'diagram.png',
  { type: 'image/png' }
)

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:local-preview'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

test('file upload previews a validated local image, allows removal and releases its URL', async () => {
  const submit = vi.fn(() => true)
  render(
    <ChatComposer
      draft=''
      onDraftChange={() => {}}
      onSubmit={submit}
      isGenerating={false}
      onStop={() => {}}
    />
  )
  await userEvent.upload(screen.getByLabelText('Upload files'), png)
  expect(await screen.findByText('diagram.png')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Remove attachment' })
  )
  expect(screen.queryByText('diagram.png')).not.toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview')
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
})

test('pasting an image retains it when Send is refused, then clears it only after accepted Send', async () => {
  const submit = vi.fn((_files: ChatAttachment[]) => false)
  render(
    <ChatComposer
      draft=''
      onDraftChange={() => {}}
      onSubmit={submit}
      isGenerating={false}
      onStop={() => {}}
    />
  )
  fireEvent.paste(screen.getByRole('textbox'), {
    clipboardData: { items: [{ kind: 'file', getAsFile: () => png }] },
  })
  await screen.findByText('diagram.png')
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  expect(screen.getByText('diagram.png')).toBeVisible()
  expect(submit.mock.calls[0]?.[0][0]).toMatchObject({
    filename: 'diagram.png',
    mediaType: 'image/png',
    content: expect.stringMatching(/^data:image\/png;base64,/),
  })
  submit.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  expect(screen.queryByText('diagram.png')).not.toBeInTheDocument()
})

test('unsupported, oversized and malformed local files are rejected before preview creation', async () => {
  for (const file of [
    new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' }),
    new File(['not an image'], 'fake.png', { type: 'image/png' }),
    new File([new Uint8Array(256 * 1024 + 1)], 'large.txt', {
      type: 'text/plain',
    }),
    new File(['binary\0text'], 'binary.txt', { type: 'text/plain' }),
  ]) {
    await expect(prepareChatAttachment(file)).rejects.toThrow()
  }
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})

test('local UTF-8 text is sent as text while image data becomes explicit OpenAI content parts', async () => {
  const image = await prepareChatAttachment(png)
  const text = await prepareChatAttachment(
    new File(['中文 notes'], 'notes.txt', { type: 'text/plain' })
  )
  expect(text.content).toBe('中文 notes')
  const messages = appendUserMessagePair([], 'Explain diagram')
  const parameters = {
    temperature: false,
    top_p: false,
    max_tokens: false,
    frequency_penalty: false,
    presence_penalty: false,
    seed: false,
  }
  const payload = buildWorkbenchChatPayload(
    messages,
    { ...DEFAULT_CONFIG, model: 'vision-model', group: 'chosen' },
    parameters,
    new Map([[messages[0].key, [image]]])
  )
  expect(payload.messages).toEqual([
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Explain diagram' },
        { type: 'image_url', image_url: { url: image.content } },
      ],
    },
  ])
})

test('unmount clears local attachment previews and never persists attachment bytes', async () => {
  const { unmount } = render(
    <ChatComposer
      draft=''
      onDraftChange={() => {}}
      onSubmit={() => false}
      isGenerating={false}
      onStop={() => {}}
    />
  )
  await userEvent.upload(screen.getByLabelText('Upload files'), png)
  await screen.findByText('diagram.png')
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview')
})

test('too many pasted files show an error and no attachment is queued', async () => {
  render(
    <ChatComposer
      draft=''
      onDraftChange={() => {}}
      onSubmit={() => false}
      isGenerating={false}
      onStop={() => {}}
    />
  )
  fireEvent.paste(screen.getByRole('textbox'), {
    clipboardData: {
      items: Array.from({ length: 5 }, () => ({
        kind: 'file',
        getAsFile: () => png,
      })),
    },
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose up to 4')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  )
})
