import { beforeEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { preserveImagePrompt, restoreImagePrompt } from '../image-studio/images'
import {
  preserveChatDraft,
  preserveChatSelection,
  restoreChatDraft,
  restoreChatSelection,
} from '../selection'

beforeEach(() => {
  useAuthStore.getState().auth.reset()
  sessionStorage.clear()
})

test('anonymous prompts transfer once but anonymous model choice is discarded on login', () => {
  preserveChatDraft('Anonymous chat')
  preserveChatSelection({ group: 'default', model: 'anonymous-model' })
  preserveImagePrompt('Anonymous image')
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'account-a', role: 1 })
  expect(restoreChatDraft()).toBe('Anonymous chat')
  expect(restoreChatSelection()).toBeNull()
  expect(restoreImagePrompt()).toBe('Anonymous image')

  useAuthStore.getState().auth.reset()
  expect(restoreChatDraft()).toBe('')
  expect(restoreChatSelection()).toBeNull()
  expect(restoreImagePrompt()).toBe('')
  useAuthStore
    .getState()
    .auth.setUser({ id: 2, username: 'account-b', role: 1 })
  expect(restoreChatDraft()).toBe('')
  expect(restoreChatSelection()).toBeNull()
  expect(restoreImagePrompt()).toBe('')
})

test('switching accounts directly preserves each account model choice and rejects stale chat writes', () => {
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'account-a', role: 1 })
  preserveChatSelection({ group: 'default', model: 'account-a-model' })
  preserveChatDraft('Account A')
  useAuthStore
    .getState()
    .auth.setUser({ id: 2, username: 'account-b', role: 1 })
  preserveChatDraft('Stale A write', 1)
  preserveChatSelection({ group: 'default', model: 'stale-model' }, 1)
  expect(restoreChatDraft()).toBe('')
  expect(restoreChatSelection()).toBeNull()
  preserveChatSelection({ group: 'default', model: 'account-b-model' })
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'account-a', role: 1 })
  expect(restoreChatDraft()).toBe('Account A')
  expect(restoreChatSelection()?.model).toBe('account-a-model')
})

test('unowned legacy values are never assigned to an anonymous session or an account', () => {
  sessionStorage.setItem(
    'aimoxt_workbench_chat_draft_v1',
    'Unknown private chat'
  )
  sessionStorage.setItem(
    'aimoxt_workbench_image_prompt_v1',
    'Unknown private image'
  )
  sessionStorage.setItem(
    'aimoxt_workbench_chat_selection_v1',
    JSON.stringify({ group: 'default', model: 'unknown' })
  )
  expect(restoreChatDraft()).toBe('')
  expect(restoreChatSelection()).toBeNull()
  expect(restoreImagePrompt()).toBe('')
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'account-a', role: 1 })
  expect(restoreChatDraft()).toBe('')
  expect(restoreChatSelection()).toBeNull()
  expect(restoreImagePrompt()).toBe('')
})
