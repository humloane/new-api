import { t } from 'i18next'

import {
  draftStorageKey,
  preserveOwnedDraft,
  restoreOwnedDraft,
  type DraftOwner,
} from '../draft-storage'

export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024
export const IMAGE_DRAFT_KEY = draftStorageKey('imagePrompt', null)
export const IMAGE_SIZES = ['1024x1024', '1536x1024', '1024x1536'] as const
export const GPT_IMAGE_2_SIZES = [
  ...IMAGE_SIZES,
  '2048x2048',
  '2048x1152',
  '1152x2048',
  '3840x2160',
  '2160x3840',
] as const
export const ALL_IMAGE_SIZES = ['auto', ...GPT_IMAGE_2_SIZES] as const
export type ImageSize = (typeof ALL_IMAGE_SIZES)[number]

/** Official GPT Image 2/2.5 presets, not a promise about any upstream reseller. */
export function getImageSizes(model: string): readonly ImageSize[] {
  if (/^gpt-image-2(?:\.5)?(?:-|$)/i.test(model)) {
    return ['auto', ...GPT_IMAGE_2_SIZES]
  }
  return ['auto', ...IMAGE_SIZES]
}

export function describeImageSize(size: ImageSize): string {
  if (size === 'auto') return t('Automatic resolution')
  const dimensions = size.replace('x', ' × ')
  if (size === '2048x2048' || size === '2048x1152' || size === '1152x2048') {
    return `2K · ${dimensions}`
  }
  if (size === '3840x2160' || size === '2160x3840') {
    return `4K · ${dimensions} · ${t('Experimental')}`
  }
  return `1K · ${dimensions}`
}

export function isExperimentalImageSize(size: ImageSize): boolean {
  if (size === 'auto') return false
  const [width, height] = size.split('x').map(Number)
  return width * height > 2560 * 1440
}

export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp'
export interface CanvasImage {
  id: string
  dataURL: string
  mimeType: ImageMimeType
  width: number
  height: number
}
export interface GeneratedImage {
  id: string
  src: string
  revisedPrompt?: string
}

export function detectImageFormat(bytes: Uint8Array): ImageMimeType | null {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) {
    return 'image/png'
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return 'image/jpeg'
  }
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export async function validateReferenceImage(
  file: File
): Promise<ImageMimeType> {
  if (!file.size || file.size > MAX_REFERENCE_BYTES) {
    throw new Error(
      t('{{filename}}: choose an image smaller than 10 MB.', {
        filename: file.name,
      })
    )
  }
  const mime = detectImageFormat(
    new Uint8Array(await file.slice(0, 12).arrayBuffer())
  )
  if (!mime || (file.type && file.type !== mime)) {
    throw new Error(
      t('{{filename}}: only valid PNG, JPEG or WebP images are supported.', {
        filename: file.name,
      })
    )
  }
  return mime
}

function safeImageSource(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
    return value
  }
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
  } catch {
    /* Ignore invalid upstream URLs. */
  }
  return null
}

/** Accept OpenAI object/array data without treating metadata-only results as images. */
export function parseImageResponse(response: unknown): GeneratedImage[] {
  if (!response || typeof response !== 'object') {
    throw new Error(t('The server returned no images.'))
  }
  const root = response as Record<string, unknown>
  if (root.error) {
    const error = root.error as Record<string, unknown>
    throw new Error(
      typeof error.message === 'string'
        ? error.message
        : t('Image generation failed.')
    )
  }
  const data = root.data ?? response
  const entries = Array.isArray(data) ? data : [data]
  const images: GeneratedImage[] = []
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    let src = safeImageSource(item.url)
    if (
      !src &&
      typeof item.b64_json === 'string' &&
      /^[A-Za-z0-9+/=\s]+$/.test(item.b64_json) &&
      item.b64_json.trim()
    ) {
      try {
        const bytes = Uint8Array.from(
          atob(item.b64_json.replaceAll(/\s/g, '')),
          (char) => char.charCodeAt(0)
        )
        const mime = detectImageFormat(bytes)
        if (mime) {
          src = `data:${mime};base64,${item.b64_json.replaceAll(/\s/g, '')}`
        }
      } catch {
        /* Invalid base64 is not a successful image result. */
      }
    }
    if (!src) continue
    images.push({
      id: crypto.randomUUID(),
      src,
      revisedPrompt:
        typeof item.revised_prompt === 'string'
          ? item.revised_prompt
          : undefined,
    })
  }
  if (!images.length) throw new Error(t('The server returned no images.'))
  return images
}

export function readImageDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)), {
      once: true,
    })
    reader.addEventListener(
      'error',
      () => reject(new Error(t('Could not read this image.'))),
      { once: true }
    )
    reader.readAsDataURL(blob)
  })
}

export async function imageToCanvas(
  image: GeneratedImage
): Promise<CanvasImage> {
  let response: Response
  try {
    response = await fetch(image.src, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new Error(
      t(
        'This image host does not allow canvas access. Download the image and upload it to the canvas.'
      )
    )
  }
  if (!response.ok) {
    throw new Error(t('Could not download this image for the canvas.'))
  }
  const blob = await response.blob()
  const mime = detectImageFormat(
    new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  )
  if (!mime || blob.size > MAX_REFERENCE_BYTES) {
    throw new Error(
      t('Canvas images must be PNG, JPEG or WebP and smaller than 10 MB.')
    )
  }
  const dataURL = await readImageDataURL(blob)
  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const decoded = new Image()
      decoded.addEventListener(
        'load',
        () =>
          resolve({
            width: decoded.naturalWidth,
            height: decoded.naturalHeight,
          }),
        { once: true }
      )
      decoded.addEventListener(
        'error',
        () => reject(new Error(t('Could not read this image.'))),
        { once: true }
      )
      decoded.src = dataURL
    }
  )
  return { id: image.id, dataURL, mimeType: mime, ...dimensions }
}

export function restoreImagePrompt(owner?: DraftOwner): string {
  return restoreOwnedDraft('imagePrompt', owner)
}
export function preserveImagePrompt(prompt: string, owner?: DraftOwner): void {
  preserveOwnedDraft('imagePrompt', prompt, owner)
}
