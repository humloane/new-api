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
  Excalidraw,
  serializeAsJSON,
  convertToExcalidrawElements,
  CaptureUpdateAction,
} from '@excalidraw/excalidraw'
import type {
  ExcalidrawInitialDataState,
  ExcalidrawProps,
  ExcalidrawImperativeAPI,
  BinaryFileData,
} from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useTheme } from '@/context/theme-provider'

import type { CanvasImageAsset } from './image-import'
import { getCanvasLanguage } from './language'
import { writeCanvas } from './storage'

import '@excalidraw/excalidraw/index.css'

// Local assets avoid depending on a third-party font CDN.
Object.assign(window, { EXCALIDRAW_ASSET_PATH: '/excalidraw-assets/' })

export default function CanvasEditor(props: {
  initialData?: ExcalidrawInitialDataState
  images?: CanvasImageAsset[]
  onImagesInserted?: () => void
  autosaveEnabled?: boolean
}) {
  const { i18n, t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failed = useRef(false)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const inserted = useRef(new Set<string>())
  const [apiReady, setApiReady] = useState(false)
  const [sceneLoaded, setSceneLoaded] = useState(false)
  useEffect(() => {
    const api = apiRef.current
    if (!apiReady || !sceneLoaded || !api || !props.images?.length) return
    const images = props.images.filter(
      (image) => !inserted.current.has(image.id)
    )
    if (!images.length) return
    const state = api.getAppState()
    const x = -state.scrollX + 80 / state.zoom.value
    const y = -state.scrollY + 100 / state.zoom.value
    const files = images.map(
      (image) =>
        ({
          id: image.id,
          dataURL: image.dataURL,
          mimeType: image.mimeType,
          created: Date.now(),
        }) as BinaryFileData
    )
    const elements = convertToExcalidrawElements(
      images.map((image, index) => {
        const scale = Math.min(1, 700 / image.width, 700 / image.height)
        return {
          type: 'image',
          fileId: image.id as BinaryFileData['id'],
          x: x + index * 48,
          y: y + index * 48,
          width: image.width * scale,
          height: image.height * scale,
          status: 'saved',
        }
      })
    )
    api.addFiles(files)
    api.updateScene({
      elements: [...api.getSceneElements(), ...elements],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
    images.forEach((image) => inserted.current.add(image.id))
    props.onImagesInserted?.()
  }, [apiReady, sceneLoaded, props])
  const save = useCallback(() => {
    if (props.autosaveEnabled === false || !pending.current) return
    const value = pending.current
    pending.current = null
    void writeCanvas(value).catch(() => {
      if (!failed.current) {
        toast.error(
          t('Canvas could not be saved. Export a backup from the canvas menu.')
        )
      }
      failed.current = true
    })
  }, [t, props.autosaveEnabled])
  useEffect(() => {
    const flush = () => save()
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      if (timer.current) clearTimeout(timer.current)
      save()
    }
  }, [save])
  const onChange: NonNullable<ExcalidrawProps['onChange']> = (
    elements,
    appState,
    files
  ) => {
    if (appState.isLoading) return
    setSceneLoaded(true)
    if (props.autosaveEnabled === false) return
    pending.current = serializeAsJSON(elements, appState, files, 'local')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(save, 700)
  }
  return (
    <Excalidraw
      initialData={props.initialData}
      excalidrawAPI={(api) => {
        apiRef.current = api
        setApiReady(true)
      }}
      onChange={onChange}
      theme={resolvedTheme}
      langCode={getCanvasLanguage(i18n.resolvedLanguage || i18n.language)}
      UIOptions={{
        canvasActions: {
          loadScene: true,
          export: { saveFileToDisk: true },
          saveToActiveFile: true,
          toggleTheme: false,
        },
      }}
    />
  )
}
