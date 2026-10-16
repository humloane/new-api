import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  defineConfig,
  loadEnv,
  type RsbuildPlugin,
  type Rspack,
} from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

import siteConfig from './site.config.json'
import {
  createSeoAssets,
  OG_IMAGE_PATH,
  parseSiteOrigin,
} from './src/lib/site-seo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 构建期把社交分享 meta 注入 index.html，未执行 JS 的爬虫/分享抓取器也能拿到
// 绝对 URL 的 og:image 与 twitter 卡片，域名取自构建期站点配置（见下方注释）。
function injectSocialMetaTags(html: string, siteOrigin: string): string {
  const metas = [
    `<meta property="og:image" content="${siteOrigin}${OG_IMAGE_PATH}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${siteOrigin}${OG_IMAGE_PATH}" />`,
  ].join('\n    ')
  return html.replace('</head>', `    ${metas}\n  </head>`)
}

export default defineConfig(({ envMode }) => {
  const env = loadEnv({ mode: envMode, prefixes: ['VITE_'] })
  const serverUrl =
    process.env.VITE_REACT_APP_SERVER_URL ||
    env.rawPublicVars.VITE_REACT_APP_SERVER_URL ||
    'http://localhost:3000'

  const siteOrigin = parseSiteOrigin(
    process.env.VITE_PUBLIC_SITE_URL ||
      env.rawPublicVars.VITE_PUBLIC_SITE_URL ||
      siteConfig.publicSiteUrl
  )
  // 域名双源约定：构建期域名（canonical / og / JSON-LD / 静态 robots、sitemap
  // 回退文件）来自上面的配置；运行时 controller/seo_assets.go 用后台
  // "服务器地址"动态生成 robots.txt / sitemap.xml。生产部署两个域名必须
  // 保持一致；后台改域名只影响 robots/sitemap，页面 meta 需重新构建。
  const seoAssets = createSeoAssets(siteOrigin)
  if (envMode === 'production' && !siteOrigin) {
    console.warn(
      '[SEO] VITE_PUBLIC_SITE_URL is unset: canonical URLs and sitemap entries are disabled.'
    )
  }
  const isProd = envMode === 'production'
  const devProxy = Object.fromEntries(
    (['/api', '/v1', '/mj', '/pg'] as const).map((key) => [
      key,
      { target: serverUrl, changeOrigin: true },
    ])
  ) as Record<string, { target: string; changeOrigin: boolean }>

  return {
    plugins: [
      pluginReact(),
      pluginTailwindcss({ optimize: false }),
      {
        name: 'site-seo-assets',
        setup(api) {
          if (siteOrigin) {
            api.modifyHTML((html) => injectSocialMetaTags(html, siteOrigin))
          }
          api.modifyRspackConfig((config, { rspack }) => {
            config.plugins ||= []
            config.plugins.push({
              apply(compiler: Rspack.Compiler) {
                compiler.hooks.thisCompilation.tap(
                  'site-seo-assets',
                  (compilation) => {
                    compilation.hooks.processAssets.tap(
                      {
                        name: 'site-seo-assets',
                        stage:
                          rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                      },
                      () => {
                        compilation.emitAsset(
                          'robots.txt',
                          new rspack.sources.RawSource(seoAssets.robots)
                        )
                        compilation.emitAsset(
                          'sitemap.xml',
                          new rspack.sources.RawSource(seoAssets.sitemap)
                        )
                      }
                    )
                  }
                )
              },
            })
          })
        },
      } satisfies RsbuildPlugin,
    ],
    // Rsbuild 2: replaces deprecated `performance.chunkSplit` (RSPack 2 aligned)
    splitChunks: {
      preset: 'default',
      cacheGroups: {
        'vendor-react': {
          test: /node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        'vendor-ui-primitives': {
          test: /node_modules[\\/](@base-ui|@radix-ui)[\\/]/,
          name: 'vendor-ui-primitives',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        'vendor-tanstack': {
          test: /node_modules[\\/]@tanstack[\\/]/,
          name: 'vendor-tanstack',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
      },
    },
    source: {
      define: {
        'import.meta.env.VITE_PUBLIC_SITE_URL': JSON.stringify(siteOrigin),
      },
      entry: {
        index: './src/main.tsx',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    html: {
      template: './index.html',
      favicon: './public/favicon.ico',
    },
    server: {
      host: '0.0.0.0',
      strictPort: false,
      proxy: devProxy,
    },
    output: {
      // Production optimizations
      minify: isProd,
      target: 'web',
      distPath: {
        root: 'dist',
      },
      // Rely on Rsbuild default legalComments ("linked" → per-chunk *.LICENSE.txt) in all modes.
      // Do not set "none" in production: that strips minifier-preserved third-party notices and
      // extracted license files, which some distributions require for open-source compliance.
    },
    performance: {
      // Remove console in production
      removeConsole: isProd ? ['log'] : false,
      buildCache: false,
    },
    tools: {
      rspack: {
        plugins: [
          tanstackRouter({
            target: 'react',
            // Dev: avoid per-route async chunks (reduces white flash on navigation + faster HMR feedback).
            // Prod: keep route-based code splitting.
            autoCodeSplitting: isProd,
          }),
        ],
      },
    },
  }
})
