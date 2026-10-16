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

/** 社交分享图（1200x630）的路径，文件位于 web/public/og-image.png。 */
export const OG_IMAGE_PATH = '/og-image.png'

/**
 * 收录进 sitemap 的公开页面。
 * 必须与 controller/seo_assets.go 的 seoSitemapPaths 保持一致（Go 二进制会基于
 * 后台"服务器地址"动态生成同一份 sitemap）。
 * 尾斜杠必须与静态文件服务的规范形式一致：/about/、/rankings/、/pricing/
 * 会 301 到无斜杠形式，收录必须使用 200 的最终 URL。
 */
const SITE_PATHS = [
  '/',
  '/about',
  '/privacy-policy',
  '/user-agreement',
  '/rankings',
  '/pricing',
] as const

/** 禁止收录的内部页面与接口路径。 */
const DISALLOWED_PATHS = [
  '/api/',
  '/v1/',
  '/v1beta/',
  '/dashboard',
  '/keys',
  '/system-settings',
  '/_authenticated/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset',
  '/otp',
  '/oauth/',
  '/setup',
] as const

export function parseSiteOrigin(value: string | undefined): string {
  if (!value?.trim()) return ''
  const url = new URL(value.trim())
  const hostRaw = url.hostname.toLowerCase()
  // 不同运行时对 IPv6 hostname 是否保留中括号不一致，统一去掉后再比较
  const host =
    hostRaw.startsWith('[') && hostRaw.endsWith(']')
      ? hostRaw.slice(1, -1)
      : hostRaw
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.startsWith('127.') ||
    host === '::1' ||
    host === '0.0.0.0'
  ) {
    throw new Error(
      'VITE_PUBLIC_SITE_URL must be a public HTTPS origin without credentials, paths, queries or fragments.'
    )
  }
  return url.origin
}

/**
 * 运行时解析站点源：构建期配置优先；未配置且当前页面为 https 部署时，回退到
 * 实际访问域名，保证 canonical / og 标签始终指向真实站点而非直接缺失。
 * http 本地开发环境不回退，避免产生无效源。
 */
export function resolveSiteOrigin(buildTimeOrigin: string): string {
  if (buildTimeOrigin) return buildTimeOrigin
  const location = (
    globalThis as { location?: { origin?: string; protocol?: string } }
  ).location
  if (location?.protocol === 'https:' && location.origin) {
    return location.origin
  }
  return ''
}

export function createSeoAssets(origin: string): {
  robots: string
  sitemap: string
} {
  const site = parseSiteOrigin(origin)
  const urls = site
    ? SITE_PATHS.map((p) => `\n  <url><loc>${site.replaceAll('&', '&amp;')}${p}</loc></url>\n`).join('')
    : ''
  return {
    robots: [
      'User-agent: *',
      'Allow: /',
      ...DISALLOWED_PATHS.map((p) => `Disallow: ${p}`),
      ...(site ? [`Sitemap: ${site}/sitemap.xml`] : []),
      '',
    ].join('\n'),
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`,
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
      {
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        url: `${site}/`,
        name,
        image: `${site}${OG_IMAGE_PATH}`,
      },
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
