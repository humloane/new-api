import { Download, ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { handleServerError } from '@/lib/handle-server-error'

import { imageToCanvas, type CanvasImage, type GeneratedImage } from './images'

export function ImageGallery(props: {
  images: GeneratedImage[]
  onOpenCanvas: (images: CanvasImage[]) => void
}) {
  const { t } = useTranslation()
  const [opening, setOpening] = useState<string | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())
  async function openCanvas(image: GeneratedImage): Promise<void> {
    if (opening) return
    setOpening(image.id)
    try {
      props.onOpenCanvas([await imageToCanvas(image)])
    } catch (error) {
      handleServerError(error, t('Could not add this image to the canvas.'))
    } finally {
      setOpening(null)
    }
  }
  if (!props.images.length) return null
  return (
    <section
      aria-label={t('Generated images')}
      aria-live='polite'
      className='grid min-w-0 gap-4 sm:grid-cols-2'
    >
      {props.images.map((image, index) => (
        <figure
          key={image.id}
          className='min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]'
        >
          {failed.has(image.id) ? (
            <p role='alert' className='p-6 text-sm text-amber-200'>
              {t('The image could not be displayed. Try the download link.')}
            </p>
          ) : (
            <img
              src={image.src}
              alt={t('Generated image {{number}}', { number: index + 1 })}
              referrerPolicy='no-referrer'
              className='aspect-square w-full object-contain'
              onError={() =>
                setFailed((current) => new Set(current).add(image.id))
              }
            />
          )}
          <figcaption className='space-y-3 p-3'>
            {image.revisedPrompt && (
              <p className='line-clamp-3 text-xs text-slate-400'>
                {image.revisedPrompt}
              </p>
            )}
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                render={
                  <a
                    href={image.src}
                    download={`aimoxt-image-${index + 1}`}
                    target='_blank'
                    rel='noreferrer'
                  />
                }
              >
                <Download aria-hidden='true' />
                {t('Download image')}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                disabled={Boolean(opening) || failed.has(image.id)}
                onClick={() => void openCanvas(image)}
              >
                <ImagePlus aria-hidden='true' />
                {opening === image.id
                  ? t('Adding to canvas...')
                  : t('Add to canvas')}
              </Button>
            </div>
          </figcaption>
        </figure>
      ))}
    </section>
  )
}
