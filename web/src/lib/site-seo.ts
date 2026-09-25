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
export const SITE_TITLE = 'AIMOXT|妙信AI - AI大模型API聚合平台'
export const SITE_DESCRIPTION =
  'AIMOXT 妙信AI提供高速、稳定、兼容 OpenAI API 的大模型接口服务，聚合 GPT、Claude、Gemini、DeepSeek 等主流 AI 模型，支持 API 中转、模型聚合、按量计费和高并发调用。'

export function parseSiteOrigin(value: string | undefined): string {
  if (!value?.trim()) return ''
  const url = new URL(value.trim())
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'VITE_PUBLIC_SITE_URL must be an HTTPS origin without credentials, paths, queries or fragments.'
    )
  }
  return url.origin
}

export function createSeoAssets(origin: string): {
  robots: string
  sitemap: string
} {
  const site = parseSiteOrigin(origin)
  return {
    robots: [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /v1/',
      'Disallow: /v1beta/',
      'Disallow: /dashboard',
      'Disallow: /keys',
      'Disallow: /system-settings',
      ...(site ? [`Sitemap: ${site}/sitemap.xml`] : []),
      '',
    ].join('\n'),
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site ? `\n  <url><loc>${site.replaceAll('&', '&amp;')}/</loc></url>\n` : ''}</urlset>\n`,
  }
}

export function createWebsiteSchema(
  origin: string,
  name: string,
  language: string
): string | null {
  const site = parseSiteOrigin(origin)
  if (!site) return null
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name },
      {
        '@type': 'WebPage',
        '@id': `${site}/#webpage`,
        url: `${site}/`,
        name,
        inLanguage: language,
        isPartOf: { '@id': `${site}/#website` },
      },
    ],
  }).replaceAll('<', '\\u003c')
}
