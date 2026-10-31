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
import type { TFunction } from 'i18next'

// Route guards and navigation must not import the settings form components.
export const MODELS_SECTIONS = [
  { id: 'global', titleKey: 'Global Model Configuration' },
  { id: 'gemini', titleKey: 'Gemini' },
  { id: 'claude', titleKey: 'Claude' },
  { id: 'grok', titleKey: 'Grok' },
  { id: 'model-deployment', titleKey: 'Model Deployment' },
] as const

export const MODELS_SECTION_IDS = MODELS_SECTIONS.map((section) => section.id)
export const MODELS_DEFAULT_SECTION = 'global' as const

export function getModelsSectionNavItems(t: TFunction) {
  return MODELS_SECTIONS.map((section) => ({
    title: t(section.titleKey),
    url: `/system-settings/models/${section.id}`,
  }))
}
