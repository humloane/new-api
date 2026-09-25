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
import { describe, expect, it } from 'vitest'

import {
  createSeoAssets,
  createWebsiteSchema,
  parseSiteOrigin,
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
    'https://user:secret@example.com',
    'https://example.com/api',
    'https://example.com/?q=1',
    'https://example.com/#x',
    'invalid',
  ])('rejects the non-origin configuration %s', (value) => {
    expect(() => parseSiteOrigin(value)).toThrow()
  })

  it('generates parseable homepage-only sitemap and matching robots declaration', () => {
    const assets = createSeoAssets(' https://www.example.com/ ')
    const xml = new DOMParser().parseFromString(
      assets.sitemap,
      'application/xml'
    )
    expect(xml.querySelector('parsererror')).toBeNull()
    expect(
      [...xml.querySelectorAll('loc')].map((node) => node.textContent)
    ).toEqual(['https://www.example.com/'])
    expect(assets.robots).toContain(
      'Sitemap: https://www.example.com/sitemap.xml'
    )
    expect(assets.sitemap).not.toContain('lastmod')
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
      }),
      expect.objectContaining({ '@type': 'WebPage', inLanguage: 'zh-CN' }),
    ])
  })
})
