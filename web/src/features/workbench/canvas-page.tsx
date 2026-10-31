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
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import { ImagePlus, Sparkles, Upload } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { readCanvasImage, type CanvasImageAsset } from './canvas/image-import'
import { readCanvas } from './canvas/storage'
import { WorkbenchShell } from './workbench-shell'

const CanvasEditor = lazy(() => import('./canvas/canvas-editor'))
const ImageStudio = lazy(() =>
  import('./image-studio').then((module) => ({ default: module.ImageStudio }))
)

export function CanvasPage() {
  const { t } = useTranslation()
  const [scene, setScene] = useState<ExcalidrawInitialDataState>()
  const [ready, setReady] = useState(false)
  const [hasOpenedCanvas, setHasOpenedCanvas] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [editorRevision, setEditorRevision] = useState(0)
  const [mode, setMode] = useState<'generate' | 'canvas'>('generate')
  const [pendingImages, setPendingImages] = useState<CanvasImageAsset[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let active = true
    void readCanvas()
      .then((value) => {
        if (!active) return
        if (value) {
          const parsed = JSON.parse(value) as ExcalidrawInitialDataState
          if (!Array.isArray(parsed.elements)) throw new Error('Invalid canvas')
          setScene(parsed)
        }
      })
      .catch(() => {
        if (active) setStorageError(true)
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])
  const handleInserted = useCallback(() => setPendingImages([]), [])
  const openCanvas = useCallback((images: CanvasImageAsset[]) => {
    setPendingImages(images)
    setHasOpenedCanvas(true)
    setMode('canvas')
  }, [])
  async function uploadFiles(files: FileList | null): Promise<void> {
    if (!files?.length || uploading) return
    setUploading(true)
    try {
      const images = await Promise.all(
        [...files].slice(0, 8).map(readCanvasImage)
      )
      openCanvas(images)
    } catch (error) {
      toast.error(
        t(error instanceof Error ? error.message : 'Could not read this image.')
      )
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  return (
    <WorkbenchShell active='canvas'>
      <div className='canvas-workspace flex min-h-0 flex-1 flex-col'>
        <div className='canvas-mode-bar'>
          <Tabs
            value={mode}
            onValueChange={(value) => {
              if (value === 'canvas') setHasOpenedCanvas(true)
              setMode(value === 'canvas' ? 'canvas' : 'generate')
            }}
          >
            <TabsList aria-label={t('Choose image workspace')}>
              <TabsTrigger value='generate'>
                <Sparkles />
                {t('AI image generation')}
              </TabsTrigger>
              <TabsTrigger value='canvas'>
                <ImagePlus />
                {t('Image canvas')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant='outline'
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload />
            {uploading ? t('Reading image...') : t('Upload image to canvas')}
          </Button>
          <input
            ref={fileRef}
            hidden
            type='file'
            multiple
            accept='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
            aria-label={t('Upload image to canvas')}
            onChange={(event) => {
              void uploadFiles(event.target.files)
            }}
          />
        </div>
        <div
          hidden={mode !== 'generate'}
          className='image-studio-host min-h-0 flex-1 overflow-auto'
        >
          <Suspense fallback={<LoadingState />}>
            <ImageStudio onOpenCanvas={openCanvas} />
          </Suspense>
        </div>
        <div
          hidden={mode !== 'canvas'}
          className='canvas-editor-host min-h-0 flex-1 flex-col'
        >
          <div className='canvas-storage-note'>
            <span>
              {t(
                'PNG, JPEG and WebP images go on the canvas. Open a .excalidraw file only to restore a project.'
              )}
            </span>
            <span>
              {storageError
                ? t(
                    'Browser storage unavailable. Use export to keep your work.'
                  )
                : t(
                    'Saved on this browser. Export to back up or move devices.'
                  )}
            </span>
            <a
              href='https://github.com/excalidraw/excalidraw'
              target='_blank'
              rel='noreferrer'
            >
              Excalidraw · MIT
            </a>
          </div>
          {storageError && (
            <div
              role='alert'
              className='border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'
            >
              <p>
                {t(
                  'Canvas recovery failed. Autosave is paused to protect the existing document.'
                )}
              </p>
              <Button
                className='mt-2'
                variant='outline'
                onClick={() => setResetOpen(true)}
              >
                {t('Start a new canvas')}
              </Button>
            </div>
          )}
          <div className='min-h-0 flex-1'>
            {ready && hasOpenedCanvas ? (
              <Suspense
                fallback={<LoadingState message={t('Loading canvas...')} />}
              >
                <CanvasEditor
                  key={editorRevision}
                  initialData={scene}
                  autosaveEnabled={!storageError}
                  images={pendingImages}
                  onImagesInserted={handleInserted}
                />
              </Suspense>
            ) : (
              mode === 'canvas' && (
                <LoadingState message={t('Restoring canvas...')} />
              )
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('Replace the previous canvas?')}
        desc={t(
          'The previous document could not be restored. Starting a new canvas will replace its local save.'
        )}
        confirmText={t('Start a new canvas')}
        destructive
        handleConfirm={() => {
          setScene(undefined)
          setStorageError(false)
          setEditorRevision((value) => value + 1)
          setResetOpen(false)
        }}
      />
    </WorkbenchShell>
  )
}
