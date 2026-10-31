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
  readImageDataURL,
  validateReferenceImage,
} from '../image-studio/images'

export interface CanvasImageAsset {
  id: string
  dataURL: string
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  width: number
  height: number
}

export async function readCanvasImage(file: File): Promise<CanvasImageAsset> {
  const mimeType = await validateReferenceImage(file)
  const dataURL = await readImageDataURL(new Blob([file], { type: mimeType }))
  const image = new Image()
  image.src = dataURL
  try {
    await image.decode()
  } catch {
    throw new Error(
      'Could not decode this image. Try exporting it as PNG or JPEG.'
    )
  }
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('Image dimensions are invalid.')
  }
  return {
    id: crypto.randomUUID(),
    dataURL,
    mimeType,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
}
