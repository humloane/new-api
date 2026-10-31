import { expect, test } from 'vitest'

import type { PricingData } from '@/features/pricing/types'

import { getImageCatalog } from '../catalog'

const imageGroup = 'GPT-image-生图分组-按次计费1.5x'
const pricing: PricingData = {
  success: true,
  data: [
    {
      id: 1,
      model_name: 'gpt-image-example',
      quota_type: 1,
      model_price: 0.04,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: [imageGroup, 'wholesale'],
      supported_endpoint_types: ['image-generation'],
    },
  ],
  usable_group: {
    [imageGroup]: { desc: '', ratio: 1.5 },
    wholesale: { desc: '', ratio: 0.1 },
  },
  vendors: [],
  group_ratio: {},
  supported_endpoint: {},
  auto_groups: [],
}

test('approved public image group is available with its published ratio without exposing wholesale routes', () => {
  expect(getImageCatalog(pricing, false).groups).toEqual([
    { value: imageGroup, label: imageGroup, ratio: 1.5, desc: '' },
  ])
})

test('authenticated image groups require the self groups authorization intersection', () => {
  expect(getImageCatalog(pricing, false, [])).toEqual({
    models: [],
    groups: [],
  })
  expect(
    getImageCatalog(pricing, false, [
      { value: imageGroup, label: imageGroup, ratio: 1.2 },
    ]).groups[0].ratio
  ).toBe(1.2)
})

test('server string descriptions use separate group_ratio values and keep wholesale routes hidden', () => {
  const actual = {
    ...pricing,
    usable_group: {
      [imageGroup]: 'Image generation',
      wholesale: 'Reseller route',
    },
    group_ratio: { [imageGroup]: 1.5, wholesale: 0.1 },
  }
  expect(getImageCatalog(actual, false).groups).toEqual([
    {
      value: imageGroup,
      label: imageGroup,
      ratio: 1.5,
      desc: 'Image generation',
    },
  ])
})
