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
import { describe, expect, it } from 'vitest'

import * as auth from '../auth/section-metadata'
import * as billing from '../billing/section-metadata'
import * as content from '../content/section-metadata'
import * as models from '../models/section-metadata'
import * as operations from '../operations/section-metadata'
import * as policy from '../request-policies/section-metadata'
import * as security from '../security/section-metadata'
import * as site from '../site/section-metadata'

describe('settings route metadata', () => {
  it('preserves auth section URLs, labels and default without loading forms', () => {
    const items = auth.getAuthSectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      {
        title: 'Basic Authentication',
        url: '/system-settings/auth/basic-auth',
      },
      { title: 'OAuth Integrations', url: '/system-settings/auth/oauth' },
      { title: 'Passkey Authentication', url: '/system-settings/auth/passkey' },
      { title: 'Bot Protection', url: '/system-settings/auth/bot-protection' },
      { title: 'Custom OAuth', url: '/system-settings/auth/custom-oauth' },
    ])
    expect(auth.AUTH_SECTION_IDS).toEqual([
      'basic-auth',
      'oauth',
      'passkey',
      'bot-protection',
      'custom-oauth',
    ])
    expect(auth.AUTH_DEFAULT_SECTION).toBe('basic-auth')
  })
  it('preserves billing section URLs, labels and default without loading forms', () => {
    const items = billing.getBillingSectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      { title: 'Quota Settings', url: '/system-settings/billing/quota' },
      { title: 'Currency & Display', url: '/system-settings/billing/currency' },
      { title: 'Model Pricing', url: '/system-settings/billing/model-pricing' },
      { title: 'Group Pricing', url: '/system-settings/billing/group-pricing' },
      { title: 'Payment Gateway', url: '/system-settings/billing/payment' },
      { title: 'Check-in Rewards', url: '/system-settings/billing/checkin' },
    ])
    expect(billing.BILLING_SECTION_IDS).toEqual([
      'quota',
      'currency',
      'model-pricing',
      'group-pricing',
      'payment',
      'checkin',
    ])
    expect(billing.BILLING_DEFAULT_SECTION).toBe('quota')
  })
  it('preserves content section URLs, labels and default without loading forms', () => {
    const items = content.getContentSectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      { title: 'Data Dashboard', url: '/system-settings/content/dashboard' },
      { title: 'Announcements', url: '/system-settings/content/announcements' },
      { title: 'API Addresses', url: '/system-settings/content/api-info' },
      { title: 'FAQ', url: '/system-settings/content/faq' },
      { title: 'Uptime Kuma', url: '/system-settings/content/uptime-kuma' },
      { title: 'Chat Presets', url: '/system-settings/content/chat' },
      { title: 'Drawing', url: '/system-settings/content/drawing' },
    ])
    expect(content.CONTENT_SECTION_IDS).toEqual([
      'dashboard',
      'announcements',
      'api-info',
      'faq',
      'uptime-kuma',
      'chat',
      'drawing',
    ])
    expect(content.CONTENT_DEFAULT_SECTION).toBe('dashboard')
  })
  it('preserves models section URLs, labels and default without loading forms', () => {
    const items = models.getModelsSectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      {
        title: 'Global Model Configuration',
        url: '/system-settings/models/global',
      },
      { title: 'Gemini', url: '/system-settings/models/gemini' },
      { title: 'Claude', url: '/system-settings/models/claude' },
      { title: 'Grok', url: '/system-settings/models/grok' },
      {
        title: 'Model Deployment',
        url: '/system-settings/models/model-deployment',
      },
    ])
    expect(models.MODELS_SECTION_IDS).toEqual([
      'global',
      'gemini',
      'claude',
      'grok',
      'model-deployment',
    ])
    expect(models.MODELS_DEFAULT_SECTION).toBe('global')
  })
  it('preserves operations section URLs, labels and default without loading forms', () => {
    const items = operations.getOperationsSectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      { title: 'System Behavior', url: '/system-settings/operations/behavior' },
      {
        title: 'Model performance metrics',
        url: '/system-settings/operations/alerts',
      },
      {
        title: 'Email & Notifications',
        url: '/system-settings/operations/email',
      },
      { title: 'Worker Proxy', url: '/system-settings/operations/worker' },
      { title: 'Log Maintenance', url: '/system-settings/operations/logs' },
      { title: 'Performance', url: '/system-settings/operations/performance' },
      {
        title: 'System maintenance',
        url: '/system-settings/operations/update-checker',
      },
    ])
    expect(operations.OPERATIONS_SECTION_IDS).toEqual([
      'behavior',
      'alerts',
      'email',
      'worker',
      'logs',
      'performance',
      'update-checker',
    ])
    expect(operations.OPERATIONS_DEFAULT_SECTION).toBe('behavior')
  })
  it('preserves security section URLs, labels and default without loading forms', () => {
    const items = security.getSecuritySectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      { title: 'Rate Limiting', url: '/system-settings/security/rate-limit' },
      { title: 'SSRF Protection', url: '/system-settings/security/ssrf' },
      { title: 'Token Limits', url: '/system-settings/security/token-limits' },
    ])
    expect(security.SECURITY_SECTION_IDS).toEqual([
      'rate-limit',
      'ssrf',
      'token-limits',
    ])
    expect(security.SECURITY_DEFAULT_SECTION).toBe('rate-limit')
  })
  it('preserves site section URLs, labels and default without loading forms', () => {
    const items = site.getSiteSectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      { title: 'System Information', url: '/system-settings/site/system-info' },
      { title: 'System Notice', url: '/system-settings/site/notice' },
      {
        title: 'Header navigation',
        url: '/system-settings/site/header-navigation',
      },
      {
        title: 'Sidebar modules',
        url: '/system-settings/site/sidebar-modules',
      },
    ])
    expect(site.SITE_SECTION_IDS).toEqual([
      'system-info',
      'notice',
      'header-navigation',
      'sidebar-modules',
    ])
    expect(site.SITE_DEFAULT_SECTION).toBe('system-info')
  })
  it('preserves request-policies section URLs, labels and default without loading forms', () => {
    const items = policy.getPolicySectionNavItems(
      ((key: string) => key) as TFunction
    )
    expect(items).toEqual([
      {
        title: 'Request checks',
        url: '/system-settings/request-policies/filtering',
      },
      {
        title: 'Sessions and retries',
        url: '/system-settings/request-policies/routing',
      },
      {
        title: 'Channel health',
        url: '/system-settings/request-policies/health',
      },
    ])
    expect(policy.POLICY_SECTION_IDS).toEqual([
      'filtering',
      'routing',
      'health',
    ])
    expect(policy.POLICY_DEFAULT_SECTION).toBe('routing')
  })
})
