import { useAuthStore } from '@/stores/auth-store'

// Version 1 used unowned global keys. Do not import those values: their account
// of origin cannot be established safely.
const STORAGE_KEYS = {
  chatDraft: 'aimoxt_workbench_chat_draft_v2',
  chatSelection: 'aimoxt_workbench_chat_selection_v2',
  imagePrompt: 'aimoxt_workbench_image_prompt_v2',
} as const

type DraftResource = keyof typeof STORAGE_KEYS
export type DraftOwner = number | null

export function draftStorageKey(
  resource: DraftResource,
  owner: DraftOwner = useAuthStore.getState().auth.user?.id ?? null
): string {
  const namespace = owner === null ? 'anonymous' : `user:${owner}`
  return `${STORAGE_KEYS[resource]}:${namespace}`
}

// Claim anonymous prompts at sign-in, including work from another page.
// Route/model preferences must be chosen again after login.
// Account switches and logout never copy an account's data into anonymous work.
useAuthStore.subscribe((state, previous) => {
  const owner = state.auth.user?.id
  if (owner === undefined || previous.auth.user !== null) return
  for (const resource of Object.keys(STORAGE_KEYS) as DraftResource[]) {
    try {
      const source = draftStorageKey(resource, null)
      const value = sessionStorage.getItem(source)
      if (value === null) continue
      sessionStorage.removeItem(source)
      if (resource === 'chatSelection') continue
      sessionStorage.setItem(draftStorageKey(resource, owner), value)
    } catch {
      // Fail closed if storage is unavailable; never reuse an unclaimed draft.
    }
  }
})

export function restoreOwnedDraft(
  resource: DraftResource,
  owner: DraftOwner = useAuthStore.getState().auth.user?.id ?? null
): string {
  try {
    return sessionStorage.getItem(draftStorageKey(resource, owner)) ?? ''
  } catch {
    return ''
  }
}

export function preserveOwnedDraft(
  resource: DraftResource,
  value: string,
  owner: DraftOwner = useAuthStore.getState().auth.user?.id ?? null
): void {
  // Ignore a stale mounted session's effects after its account has changed.
  if (owner !== (useAuthStore.getState().auth.user?.id ?? null)) return
  try {
    const key = draftStorageKey(resource, owner)
    if (value) sessionStorage.setItem(key, value)
    else sessionStorage.removeItem(key)
  } catch {
    // Storage policy must not prevent composing or signing in.
  }
}
