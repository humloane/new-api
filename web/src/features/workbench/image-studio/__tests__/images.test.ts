import { describe, expect, test } from 'vitest'

import {
  detectImageFormat,
  parseImageResponse,
  validateReferenceImage,
} from '../images'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

describe('image response contract', () => {
  test('object-shaped data returns a usable image', () => {
    expect(
      parseImageResponse({ data: { url: 'https://images.example/one.png' } })
    ).toEqual([
      expect.objectContaining({ src: 'https://images.example/one.png' }),
    ])
  })
  test('array data accepts URL and base64 image payloads while excluding metadata', () => {
    const base64 = btoa(String.fromCharCode(...png))
    expect(
      parseImageResponse({
        data: [
          { url: 'https://images.example/one.png' },
          { b64_json: base64 },
          { revised_prompt: 'Metadata' },
        ],
      }).map((image) => image.src)
    ).toEqual([
      'https://images.example/one.png',
      `data:image/png;base64,${base64}`,
    ])
  })
  test('empty and unsafe responses cannot become successful images', () => {
    for (const response of [
      { data: [] },
      { data: [{ revised_prompt: 'No image' }] },
      { data: { url: 'javascript:alert(1)' } },
      { data: { b64_json: 'bm90LWFuLWltYWdl' } },
    ]) {
      expect(() => parseImageResponse(response)).toThrow(
        'The server returned no images.'
      )
    }
  })
  test('upstream errors preserve their reason', () => {
    expect(() =>
      parseImageResponse({ error: { message: 'Insufficient balance' } })
    ).toThrow('Insufficient balance')
  })
})

describe('reference image validation', () => {
  test('magic bytes recognize PNG, JPEG and WebP rather than trusting extensions', () => {
    expect(detectImageFormat(png)).toBe('image/png')
    expect(detectImageFormat(new Uint8Array([255, 216, 255, 224]))).toBe(
      'image/jpeg'
    )
    expect(detectImageFormat(new TextEncoder().encode('RIFF0000WEBP'))).toBe(
      'image/webp'
    )
    expect(
      detectImageFormat(new TextEncoder().encode('<svg></svg>'))
    ).toBeNull()
  })
  test('an invalid file reports its filename explicitly', async () => {
    const file = {
      name: 'fake.png',
      type: 'image/png',
      size: 12,
      slice: () => ({
        arrayBuffer: async () => new TextEncoder().encode('<svg></svg>').buffer,
      }),
    } as unknown as File
    await expect(validateReferenceImage(file)).rejects.toThrow(
      'fake.png: only valid PNG, JPEG or WebP images are supported.'
    )
  })
  test('oversized files fail before reading file contents', async () => {
    await expect(
      validateReferenceImage({
        name: 'large.png',
        size: 10 * 1024 * 1024 + 1,
      } as File)
    ).rejects.toThrow('large.png: choose an image smaller than 10 MB.')
  })
})

describe('model-specific output resolutions', () => {
  test('GPT Image 2.5 offers documented 2K and 4K presets, not an unsupported 4096 square', async () => {
    const { getImageSizes, isExperimentalImageSize } = await import('../images')
    for (const name of [
      'gpt-image-2',
      'gpt-image-2.5',
      'gpt-image-2.5-sunburst',
      'gpt-image-2.5-flare',
    ]) {
      expect(getImageSizes(name)).toContain('2048x2048')
      expect(getImageSizes(name)).toContain('3840x2160')
      expect(getImageSizes(name)).not.toContain('4096x4096')
    }
    expect(isExperimentalImageSize('3840x2160')).toBe(true)
    expect(isExperimentalImageSize('2048x1152')).toBe(false)
  })
  test('unknown models do not inherit unverified high-resolution presets', async () => {
    const { getImageSizes } = await import('../images')
    expect(getImageSizes('unverified-image-model')).not.toContain('3840x2160')
    expect(getImageSizes('unverified-image-model')).toContain('auto')
  })
})
