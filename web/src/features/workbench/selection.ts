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
import type { GroupOption, ModelOption } from '@/features/playground/types'
import type { PricingData } from '@/features/pricing/types'

import {
  draftStorageKey,
  preserveOwnedDraft,
  restoreOwnedDraft,
  type DraftOwner,
} from './draft-storage'

// Explicit public retail products only. Never infer a public tier from a ratio
// or a name substring: that could expose reseller or wholesale routes.
export const RETAIL_GROUPS = [
  'DeepSeek-国模之光-性价比0.2x',
  'DeepSeek-国模之光-稳定0.4x',
  'DeepSeek-国模之光-旗舰0.8x',
  'GPT-Pro正价Key-稳定-0.3x',
  'GPT-旗舰组-不降智-禁止破甲-0.5x',
  'Claude-官渠CC Max满血-1.6x',
  'Kiro-AWS官方-高缓存-高智商',
  '注册用户',
  'default',
  '国产-经济',
  '国产-稳定',
  '国产-旗舰',
  'GPT-高性价比',
  'GPT-标准稳定',
  'GPT-满血不降智',
  'GPT-满血旗舰',
  'GPT-Azure官方满速满血',
] as const

export interface ChatSelection {
  group: string
  model: string
  automatic?: boolean
}

// The public pricing API returns descriptions and ratios in separate maps.
// Accept the older object fixtures at this boundary without changing shared DTOs.
export type WorkbenchPricing = Omit<PricingData, 'usable_group'> & {
  usable_group: unknown
}

export function normalizePricingGroups(
  pricing: WorkbenchPricing
): GroupOption[] {
  if (!pricing.usable_group || typeof pricing.usable_group !== 'object') {
    return []
  }
  return Object.entries(pricing.usable_group).map(([name, value]) => {
    let desc: string | undefined
    let legacyRatio: number | string | undefined
    if (typeof value === 'string') desc = value
    else if (value && typeof value === 'object') {
      const group = value as Record<string, unknown>
      if (typeof group.desc === 'string') desc = group.desc
      if (typeof group.ratio === 'number' || typeof group.ratio === 'string') {
        legacyRatio = group.ratio
      }
    }
    return {
      value: name,
      label: name,
      desc,
      ratio: pricing.group_ratio?.[name] ?? legacyRatio ?? Number.NaN,
    }
  })
}

export function getRetailCatalog(pricing: WorkbenchPricing | undefined): {
  groups: GroupOption[]
  models: Map<string, ModelOption[]>
} {
  const models = new Map<string, ModelOption[]>()
  const groups: GroupOption[] = []
  if (!pricing?.success) return { groups, models }

  const publishedGroups = normalizePricingGroups(pricing)
  for (const group of RETAIL_GROUPS) {
    const publishedGroup = publishedGroups.find(
      (option) => option.value === group
    )
    if (!publishedGroup) continue
    const options = pricing.data
      .filter((model) => {
        if (!model.enable_groups?.includes(group)) return false
        // Only list models explicitly supporting the chat completion endpoint.
        return model.supported_endpoint_types?.includes('openai') === true
      })
      .map((model) => ({ label: model.model_name, value: model.model_name }))
    if (options.length === 0) continue
    models.set(group, options)
    groups.push(publishedGroup)
  }
  return { groups, models }
}

export function isAvailableSelection(
  selection: ChatSelection,
  groups: GroupOption[],
  models: ModelOption[]
): boolean {
  return (
    groups.some((group) => group.value === selection.group) &&
    models.some((model) => model.value === selection.model)
  )
}

export function getRecommendedSelection(
  catalog: ReturnType<typeof getRetailCatalog>
): ChatSelection | null {
  for (const group of catalog.groups) {
    const models = catalog.models.get(group.value) ?? []
    const recommended =
      models.find((model) => model.value === 'deepseek-v4.1-flash') ?? models[0]
    if (recommended) return { group: group.value, model: recommended.value }
  }
  return null
}

export const WORKBENCH_DRAFT_KEY = draftStorageKey('chatDraft', null)

export function restoreChatSelection(owner?: DraftOwner): ChatSelection | null {
  try {
    const value: unknown = JSON.parse(
      restoreOwnedDraft('chatSelection', owner) || 'null'
    )
    if (
      value &&
      typeof value === 'object' &&
      'group' in value &&
      'model' in value &&
      typeof value.group === 'string' &&
      typeof value.model === 'string'
    ) {
      return {
        group: value.group,
        model: value.model,
        ...('automatic' in value && value.automatic === true
          ? { automatic: true }
          : {}),
      }
    }
  } catch {
    // Storage can be unavailable or an old draft may be invalid.
  }
  return null
}

export function preserveChatSelection(
  selection: ChatSelection,
  owner?: DraftOwner
): void {
  preserveOwnedDraft('chatSelection', JSON.stringify(selection), owner)
}

export function restoreChatDraft(owner?: DraftOwner): string {
  return restoreOwnedDraft('chatDraft', owner)
}

export function preserveChatDraft(draft: string, owner?: DraftOwner): void {
  preserveOwnedDraft('chatDraft', draft, owner)
}
