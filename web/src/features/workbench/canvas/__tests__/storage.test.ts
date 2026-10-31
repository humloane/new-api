import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { readCanvas, writeCanvas } from '../storage'

describe('local canvas persistence', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()))
  afterEach(() => vi.unstubAllGlobals())
  it('restores saved elements together with image data after reopening storage', async () => {
    expect(await readCanvas()).toBeUndefined()
    const scene = JSON.stringify({
      elements: [
        { id: 'image-1', type: 'image', fileId: 'asset-1', x: 120, y: 42 },
      ],
      files: { 'asset-1': { dataURL: 'data:image/png;base64,dGVzdA==' } },
    })
    await writeCanvas(scene)
    expect(await readCanvas()).toBe(scene)
  })
  it('replaces the previous document when an edited scene is saved', async () => {
    await writeCanvas('{"elements":[{"id":"first"}]}')
    await writeCanvas('{"elements":[{"id":"second"}]}')
    expect(JSON.parse((await readCanvas()) ?? 'null')).toEqual({
      elements: [{ id: 'second' }],
    })
  })
  it('reports unavailable browser storage instead of claiming a successful save', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('Storage blocked')
      },
    })
    await expect(writeCanvas('{}')).rejects.toThrow('Storage blocked')
  })
})
