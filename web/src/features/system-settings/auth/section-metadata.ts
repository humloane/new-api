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
export const AUTH_SECTIONS = [
  { id: 'basic-auth', titleKey: 'Basic Authentication' },
  { id: 'oauth', titleKey: 'OAuth Integrations' },
  { id: 'passkey', titleKey: 'Passkey Authentication' },
  { id: 'bot-protection', titleKey: 'Bot Protection' },
  { id: 'custom-oauth', titleKey: 'Custom OAuth' },
] as const

export const AUTH_SECTION_IDS = AUTH_SECTIONS.map((section) => section.id)
export const AUTH_DEFAULT_SECTION = 'basic-auth' as const

export function getAuthSectionNavItems(t: TFunction) {
  return AUTH_SECTIONS.map((section) => ({
    title: t(section.titleKey),
    url: `/system-settings/auth/${section.id}`,
  }))
}
