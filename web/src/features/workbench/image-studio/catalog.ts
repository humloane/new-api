import type { GroupOption } from '@/features/playground/types'
import type { PricingModel } from '@/features/pricing/types'

import {
  RETAIL_GROUPS,
  normalizePricingGroups,
  type WorkbenchPricing,
} from '../selection'

export function getImageCatalog(
  pricing: WorkbenchPricing | undefined,
  editing: boolean,
  authorizedGroups?: GroupOption[]
): { models: PricingModel[]; groups: GroupOption[] } {
  if (!pricing?.success) return { models: [], groups: [] }
  const endpoint = editing ? 'image-edit' : 'image-generation'
  const models = (pricing?.data ?? []).filter((model) =>
    model.supported_endpoint_types?.includes(endpoint)
  )
  const availableGroups =
    authorizedGroups ??
    normalizePricingGroups(pricing).filter(
      (group) =>
        (RETAIL_GROUPS as readonly string[]).includes(group.value) ||
        group.value === 'GPT-image-生图分组-按次计费1.5x'
    )
  const groups = availableGroups.filter((group) =>
    models.some((model) => model.enable_groups?.includes(group.value))
  )
  return {
    groups,
    models: models.filter((model) =>
      groups.some((group) => model.enable_groups?.includes(group.value))
    ),
  }
}
