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
export const OPERATIONS_SECTIONS = [
  { id: 'behavior', titleKey: 'System Behavior' },
  { id: 'alerts', titleKey: 'Model performance metrics' },
  { id: 'email', titleKey: 'Email & Notifications' },
  { id: 'worker', titleKey: 'Worker Proxy' },
  { id: 'logs', titleKey: 'Log Maintenance' },
  { id: 'performance', titleKey: 'Performance' },
  { id: 'update-checker', titleKey: 'System maintenance' },
] as const

export const OPERATIONS_SECTION_IDS = OPERATIONS_SECTIONS.map(
  (section) => section.id
)
export const OPERATIONS_DEFAULT_SECTION = 'behavior' as const

export function getOperationsSectionNavItems(t: TFunction) {
  return OPERATIONS_SECTIONS.map((section) => ({
    title: t(section.titleKey),
    url: `/system-settings/operations/${section.id}`,
  }))
}
