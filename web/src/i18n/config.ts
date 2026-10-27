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
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { convertDetectedLanguage } from './languages'
import en from './locales/en.json'
import zhCN from './locales/zh.json'

// Keep the two highest-traffic locales in the initial bundle. The other
// locales are loaded only when the visitor actually switches to them; bundling
// every translation file here adds roughly 4 MB to the public first load.
const lazyLocaleLoaders = {
  fr: () => import('./locales/fr.json'),
  ru: () => import('./locales/ru.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
  zhTW: () => import('./locales/zh-TW.json'),
} as const

const loadedLocales = new Set<string>(['en', 'zhCN'])

export const resources = {
  en,
  zhCN,
} as const

export async function ensureLocale(language: string): Promise<void> {
  if (loadedLocales.has(language)) return
  const loader = lazyLocaleLoaders[language as keyof typeof lazyLocaleLoaders]
  if (!loader) return
  const module = await loader()
  i18n.addResourceBundle(
    language,
    'translation',
    module.default.translation,
    true,
    true
  )
  loadedLocales.add(language)
  // addResourceBundle does not emit languageChanged on every i18next version;
  // notify subscribed React components once the requested bundle is present.
  i18n.emit('languageChanged', language)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zhCN', 'fr', 'ru', 'ja', 'vi', 'zhTW'],
    load: 'currentOnly',
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Browsers report `zh-CN`/`zh-TW`/`zh`; map them onto our `zhCN`/`zhTW`
      // codes (non-Chinese codes pass through for normal supportedLngs matching).
      convertDetectedLanguage,
    },
  })
  .then(() => ensureLocale(i18n.language))
  .catch(() => {
    /* empty */
  })

i18n.on('languageChanged', (language) => {
  void ensureLocale(language)
})

export default i18n
