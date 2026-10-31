import { t } from 'i18next'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import {
  parseImageResponse,
  getImageSizes,
  type GeneratedImage,
  type ImageSize,
} from './images'

export interface ImageRequest {
  model: string
  group: string
  prompt: string
  size: ImageSize
  reference?: File
}

export async function requestImages(
  request: ImageRequest
): Promise<GeneratedImage[]> {
  if (!useAuthStore.getState().auth.user) {
    throw new Error(t('Sign in to generate images.'))
  }
  if (!getImageSizes(request.model).includes(request.size)) {
    throw new Error(
      t('This resolution is not available for the selected model.')
    )
  }
  let payload: FormData | Record<string, string | number>
  if (request.reference) {
    payload = new FormData()
    payload.set('model', request.model)
    payload.set('group', request.group)
    payload.set('prompt', request.prompt)
    payload.set('size', request.size)
    payload.set('n', '1')
    payload.set('image', request.reference, request.reference.name)
  } else {
    payload = {
      model: request.model,
      group: request.group,
      prompt: request.prompt,
      size: request.size,
      n: 1,
    }
  }
  const response = await api.post(
    request.reference ? '/pg/images/edits' : '/pg/images/generations',
    payload,
    {
      // Refresh before dispatch; the shared client must never replay a paid request.
      singleUseAuthorization: true,
      skipAuthRefresh: true,
      skipErrorHandler: true,
      headers: {
        'Content-Type': request.reference ? undefined : 'application/json',
      },
      // singleUseAuthorization refresh supplies JSON headers; remove them for FormData
      // immediately before Axios serializes it so the browser creates the boundary.
      transformRequest: request.reference
        ? [
            (data, headers) => {
              headers.delete('Content-Type')
              return data
            },
          ]
        : undefined,
    }
  )
  return parseImageResponse(requireServerSuccess(response.data))
}
