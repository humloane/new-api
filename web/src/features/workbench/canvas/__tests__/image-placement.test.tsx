import { act, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import CanvasEditor from '../canvas-editor'
import { getCanvasLanguage } from '../language'
import { writeCanvas } from '../storage'

const engine = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
  api: {
    getAppState: vi.fn(() => ({ scrollX: 0, scrollY: 0, zoom: { value: 1 } })),
    getSceneElements: vi.fn(() => []),
    addFiles: vi.fn(),
    updateScene: vi.fn(),
  },
}))
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: (props: Record<string, unknown>) => {
    engine.props = props
    useEffect(() => {
      ;(props.excalidrawAPI as (api: unknown) => void)(engine.api)
    }, [props])
    return <div data-testid='canvas-engine' />
  },
  serializeAsJSON: () => '{}',
  convertToExcalidrawElements: (elements: unknown) => elements,
  CaptureUpdateAction: { IMMEDIATELY: 'IMMEDIATELY' },
}))
vi.mock('../storage', () => ({ writeCanvas: vi.fn(async () => {}) }))

afterEach(() => {
  vi.clearAllMocks()
  engine.props = null
})

test('first upload waits for scene initialization and inserts the ordinary image exactly once', async () => {
  const inserted = vi.fn()
  const images = [
    {
      id: 'uploaded-png',
      dataURL: 'data:image/png;base64,aA==',
      mimeType: 'image/png' as const,
      width: 320,
      height: 240,
    },
  ]
  const { rerender } = render(
    <CanvasEditor images={images} onImagesInserted={inserted} />
  )
  expect(engine.api.updateScene).not.toHaveBeenCalled()
  act(() => {
    const change = engine.props?.onChange as (
      elements: unknown[],
      state: unknown,
      files: unknown
    ) => void
    change([], { isLoading: true }, {})
  })
  expect(engine.api.updateScene).not.toHaveBeenCalled()
  act(() => {
    const change = engine.props?.onChange as (
      elements: unknown[],
      state: unknown,
      files: unknown
    ) => void
    change([], { isLoading: false }, {})
  })
  await waitFor(() => expect(engine.api.updateScene).toHaveBeenCalledOnce())
  expect(engine.api.addFiles).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'uploaded-png', mimeType: 'image/png' }),
  ])
  expect(engine.api.updateScene).toHaveBeenCalledWith(
    expect.objectContaining({
      elements: [
        expect.objectContaining({
          type: 'image',
          fileId: 'uploaded-png',
          width: 320,
          height: 240,
        }),
      ],
    })
  )
  rerender(<CanvasEditor images={[...images]} onImagesInserted={inserted} />)
  expect(engine.api.updateScene).toHaveBeenCalledOnce()
  expect(inserted).toHaveBeenCalledOnce()
})

test('failed restoration mode never writes an empty editor over the previous document', async () => {
  vi.useFakeTimers()
  try {
    render(<CanvasEditor autosaveEnabled={false} />)
    act(() => {
      const change = engine.props?.onChange as (
        elements: unknown[],
        state: unknown,
        files: unknown
      ) => void
      change([], { isLoading: false }, {})
      vi.advanceTimersByTime(1000)
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(writeCanvas).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
  }
})

test('canvas locale respects Traditional Chinese and all supported interface languages', () => {
  expect(getCanvasLanguage('zhTW')).toBe('zh-TW')
  expect(getCanvasLanguage('zhCN')).toBe('zh-CN')
  for (const lang of ['en', 'fr', 'ru', 'ja', 'vi']) {
    expect(getCanvasLanguage(lang)).toBe(lang)
  }
  expect(getCanvasLanguage('invalid-locale-!')).toBe('en')
})
