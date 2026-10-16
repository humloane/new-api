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
import { describe, expect, it, vi } from 'vitest'

import {
  createSeoAssets,
  createWebsiteSchema,
  OG_IMAGE_PATH,
  parseSiteOrigin,
  resolveSiteOrigin,
} from '../site-seo'

describe('public website SEO', () => {
  it('omits canonical-domain claims and sitemap entries until a site is configured', () => {
    expect(parseSiteOrigin(undefined)).toBe('')
    const assets = createSeoAssets('')
    expect(assets.robots).not.toContain('Sitemap:')
    expect(assets.robots).not.toContain('Disallow: /\n')
    expect(assets.sitemap).not.toContain('<loc>')
    expect(createWebsiteSchema('', 'AIMOXT', 'en')).toBeNull()
  })

  it.each([
    'http://example.com',
    'http://localhost:3000',
    'https://localhost',
    'https://foo.localhost',
    'https://127.0.0.1:8443',
    'https://[::1]',
    'https://new-api.local',
    'https://user:secret@example.com',
    'https://example.com/api',
    'https://example.com/?q=1',
    'https://example.com/#x',
    'invalid',
  ])('rejects the non-origin configuration %s', (value) => {
    expect(() => parseSiteOrigin(value)).toThrow()
  })

  it('generates parseable public-page sitemap and matching robots declaration', () => {
    const assets = createSeoAssets(' https://www.example.com/ ')
    const xml = new DOMParser().parseFromString(
      assets.sitemap,
      'application/xml'
    )
    expect(xml.querySelector('parsererror')).toBeNull()
    expect(
      [...xml.querySelectorAll('loc')].map((node) => node.textContent)
    ).toEqual([
      'https://www.example.com/',
      'https://www.example.com/about',
      'https://www.example.com/privacy-policy',
      'https://www.example.com/user-agreement',
      'https://www.example.com/rankings',
      'https://www.example.com/pricing',
    ])
    expect(assets.robots).toContain(
      'Sitemap: https://www.example.com/sitemap.xml'
    )
    // 登录后可见页面与接口路径必须被禁止收录，且不影响 sitemap 中的公开页面
    expect(assets.robots).toContain('Disallow: /_authenticated/')
    expect(assets.robots).toContain('Disallow: /api/')
    expect(assets.robots).not.toContain('Disallow: /pricing')
    expect(assets.sitemap).not.toContain('lastmod')
  })

  it('resolves the runtime origin with build-time value first and https window fallback', () => {
    expect(resolveSiteOrigin('https://www.example.com')).toBe(
      'https://www.example.com'
    )
    // 本地 jsdom 环境为 http，不允许回退，避免产生无效源
    expect(resolveSiteOrigin('')).toBe('')

    vi.stubGlobal('location', {
      origin: 'https://prod.example.com',
      protocol: 'https:',
    })
    try {
      expect(resolveSiteOrigin('')).toBe('https://prod.example.com')
      expect(
        resolveSiteOrigin('https://www.example.com')
      ).toBe('https://www.example.com')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('escapes embedded script delimiters while preserving website name and language', () => {
    const name = 'AIMOXT </script><script>alert(1)</script>'
    const value =
      createWebsiteSchema('https://www.example.com', name, 'zh-CN') || ''
    expect(value).not.toContain('<')
    expect(JSON.parse(value)['@graph']).toEqual([
      expect.objectContaining({
        '@type': 'WebSite',
        name,
        url: 'https://www.example.com/',
        image: `https://www.example.com${OG_IMAGE_PATH}`,
      }),
      expect.objectContaining({ '@type': 'WebPage', inLanguage: 'zh-CN' }),
    ])
  })
})
