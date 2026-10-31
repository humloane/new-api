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
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Code2,
  Lightbulb,
  MessageSquare,
  Plus,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUserGroups, getUserModels } from '@/features/playground/api'
import { PlaygroundChat } from '@/features/playground/components/chat/playground-chat'
import { DEFAULT_CONFIG } from '@/features/playground/constants'
import {
  useChatHandler,
  usePlaygroundConversation,
} from '@/features/playground/hooks'
import type { Message, ParameterEnabled } from '@/features/playground/types'
import { getPricing } from '@/features/pricing/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { WorkbenchAuthGate } from './auth-gate'
import { ChatComposer } from './chat-composer'
import {
  getRetailCatalog,
  getRecommendedSelection,
  preserveChatSelection,
  restoreChatSelection,
  isAvailableSelection,
  preserveChatDraft,
  restoreChatDraft,
  type ChatSelection,
} from './selection'
import { WorkbenchShell } from './workbench-shell'

// Let the selected model use its provider defaults, without unsupported tuning.
const PARAMETERS: ParameterEnabled = {
  temperature: false,
  top_p: false,
  max_tokens: false,
  frequency_penalty: false,
  presence_penalty: false,
  seed: false,
}

export function WorkbenchChatPage() {
  const user = useAuthStore((state) => state.auth.user)
  // Remount account-owned history and drafts on logout/account changes.
  return <WorkbenchChatSession key={user?.id ?? 'anonymous'} />
}

function WorkbenchChatSession() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const owner = user?.id ?? null
  const [draft, setDraft] = useState(() => restoreChatDraft(owner))
  const [selection, setSelection] = useState<ChatSelection>(() => {
    const saved = restoreChatSelection(owner)
    if (user) {
      return saved && !saved.automatic && saved.model
        ? saved
        : { group: user.group ?? 'default', model: '' }
    }
    return saved ?? { group: '', model: '' }
  })
  const [groupChosen, setGroupChosen] = useState(
    !user || Boolean(selection.model)
  )
  const [messages, updateMessages] = useState<Message[]>([])
  const [authOpen, setAuthOpen] = useState(false)
  const [selectionNotice, setSelectionNotice] = useState(false)
  const pricing = useQuery({
    queryKey: ['workbench', 'catalog', owner, user?.group],
    refetchOnMount: 'always',
    queryFn: async () => requireServerSuccess(await getPricing()),
    staleTime: 60_000,
  })
  const catalog = useMemo(() => getRetailCatalog(pricing.data), [pricing.data])
  useEffect(() => {
    if (selection.group) preserveChatSelection(selection, owner)
  }, [selection, owner])
  const userGroups = useQuery({
    queryKey: ['workbench', user?.id, 'groups', user?.group],
    queryFn: getUserGroups,
    enabled: Boolean(user),
  })
  const groups = useMemo(
    () => (user ? (userGroups.data ?? []) : catalog.groups),
    [user, userGroups.data, catalog]
  )
  const userModels = useQuery({
    queryKey: ['workbench', user?.id, 'models', selection.group, user?.group],
    queryFn: () => getUserModels(selection.group),
    enabled:
      Boolean(user) && groups.some((group) => group.value === selection.group),
  })
  const models = useMemo(
    () =>
      user
        ? (userModels.data ?? []).filter((model) =>
            pricing.data?.data.some(
              (candidate) =>
                candidate.model_name === model.value &&
                candidate.enable_groups?.includes(selection.group) &&
                candidate.supported_endpoint_types?.includes('openai') === true
            )
          )
        : (catalog.models.get(selection.group) ?? []),
    [user, userModels.data, pricing.data, selection.group, catalog]
  )
  useEffect(() => {
    if (
      !pricing.isSuccess ||
      pricing.isFetching ||
      (user && (!userGroups.isSuccess || userGroups.isFetching))
    ) {
      return
    }
    if (user && !groupChosen) return
    const groupAvailable = groups.some(
      (group) => group.value === selection.group
    )
    // Keep an explicit unavailable choice visible; never silently upgrade it.
    if (selection.group && !selection.automatic && !groupAvailable) return
    if (!groupAvailable) {
      const preferred = groups.find((group) => group.value === user?.group)
      const recommended = getRecommendedSelection(catalog)
      const nextGroup =
        preferred?.value ??
        groups.find((group) => group.value === recommended?.group)?.value ??
        groups[0]?.value
      if (nextGroup) {
        setSelection({ group: nextGroup, model: '', automatic: true })
      }
      return
    }
    if (user && (!userModels.isSuccess || userModels.isFetching)) return
    if (
      selection.model &&
      (!selection.automatic ||
        models.some((model) => model.value === selection.model))
    ) {
      return
    }
    const recommended =
      models.find((model) => model.value === 'deepseek-v4.1-flash') ?? models[0]
    if (recommended) {
      setSelection({
        ...selection,
        model: recommended.value,
        automatic: owner === null,
      })
    }
  }, [
    pricing.isSuccess,
    pricing.isFetching,
    user,
    userGroups.isSuccess,
    userGroups.isFetching,
    userModels.isSuccess,
    userModels.isFetching,
    groups,
    models,
    catalog,
    selection,
    owner,
    groupChosen,
  ])
  const selectionAvailable = isAvailableSelection(selection, groups, models)
  const canSend =
    selectionAvailable &&
    pricing.isSuccess &&
    !pricing.isFetching &&
    userModels.isSuccess &&
    !userModels.isFetching &&
    userGroups.isSuccess &&
    !userGroups.isFetching
  const config = { ...DEFAULT_CONFIG, ...selection }
  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled: PARAMETERS,
    onMessageUpdate: updateMessages,
  })
  const guardedSend = useCallback(
    (nextMessages: Message[]) => {
      if (useAuthStore.getState().auth.user?.id !== owner || owner === null) {
        setAuthOpen(true)
        return
      }
      if (!canSend || isGenerating) {
        setSelectionNotice(true)
        return
      }
      sendChat(nextMessages)
    },
    [canSend, isGenerating, sendChat, owner]
  )
  const conversation = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat: guardedSend,
  })

  function updateDraft(value: string): void {
    setDraft(value)
    preserveChatDraft(value, owner)
  }

  function submitDraft(): void {
    if (!draft.trim() || isGenerating) return
    preserveChatDraft(draft, owner)
    if (!user) {
      setAuthOpen(true)
      return
    }
    if (!canSend) {
      setSelectionNotice(true)
      return
    }
    conversation.handleSendMessage(draft.trim())
    updateDraft('')
    setSelectionNotice(false)
  }

  return (
    <WorkbenchShell active='chat'>
      <div className='workbench-chat-layout'>
        <aside
          className='workbench-conversations'
          aria-label={t('Conversations')}
        >
          <div className='workbench-conversation-heading'>
            <strong>{t('Conversations')}</strong>
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={t('New conversation')}
              disabled={isGenerating}
              onClick={() => updateMessages([])}
            >
              <Plus aria-hidden='true' />
            </Button>
          </div>
          <Button
            variant='outline'
            className='workbench-new-chat'
            disabled={isGenerating}
            onClick={() => updateMessages([])}
          >
            <Plus aria-hidden='true' />
            {t('New conversation')}
          </Button>
          <div className='workbench-conversation-current'>
            <MessageSquare aria-hidden='true' />
            <span>
              {messages.length
                ? t('Current conversation')
                : t('Your next idea starts here')}
            </span>
          </div>
          <p className='workbench-conversation-note'>
            {t(
              'Conversation stays in this page. Your unsent draft is kept in this tab.'
            )}
          </p>
          <Link to='/canvas' className='workbench-canvas-link'>
            <WandSparkles aria-hidden='true' />
            <span>
              {t('Make room for ideas')}
              <small>{t('Open infinite canvas')}</small>
            </span>
            <ArrowUpRight aria-hidden='true' />
          </Link>
        </aside>
        <section
          className='workbench-chat-main'
          aria-label={t('Online assistant')}
        >
          <div className='workbench-model-toolbar'>
            <div className='workbench-model-selectors'>
              <Select
                value={selection.group || null}
                onValueChange={(group) => {
                  if (group) {
                    setGroupChosen(true)
                    setSelection({ group, model: '' })
                    setSelectionNotice(false)
                  }
                }}
                disabled={isGenerating}
              >
                <SelectTrigger aria-label={t('Select a route')}>
                  <SelectValue placeholder={t('Select a route')} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selection.model || null}
                onValueChange={(model) => {
                  if (model) {
                    setSelection((current) => ({
                      ...current,
                      model,
                      automatic: false,
                    }))
                    setSelectionNotice(false)
                  }
                }}
                disabled={
                  !selection.group || isGenerating || userModels.isFetching
                }
              >
                <SelectTrigger aria-label={t('Select a model')}>
                  <SelectValue placeholder={t('Select a model')} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={t('New conversation')}
              disabled={isGenerating || messages.length === 0}
              onClick={() => updateMessages([])}
            >
              <Plus aria-hidden='true' />
            </Button>
            <span className='workbench-session-label'>
              <span className='workbench-live-dot' />
              {t('Personal workspace')}
            </span>
          </div>
          {messages.length === 0 ? (
            <div className='workbench-greeting'>
              <div className='workbench-greeting-mark'>
                <Sparkles aria-hidden='true' />
              </div>
              <p className='workbench-eyebrow'>AIMOXT ASSISTANT</p>
              <h1>{t('What will you create today?')}</h1>
              <p>
                {t(
                  'A fresh perspective, a clearer answer, or your next big idea. Start here.'
                )}
              </p>
              <div className='workbench-suggestions'>
                <Button
                  variant='outline'
                  onClick={() =>
                    updateDraft(
                      t('Help me brainstorm ideas for a new project.')
                    )
                  }
                >
                  <Lightbulb aria-hidden='true' />
                  {t('Explore an idea')}
                </Button>
                <Button
                  variant='outline'
                  onClick={() =>
                    updateDraft(t('Help me understand and improve this code:'))
                  }
                >
                  <Code2 aria-hidden='true' />
                  {t('Write better code')}
                </Button>
                <Button
                  variant='outline'
                  onClick={() =>
                    updateDraft(
                      t('Help me turn these notes into a clear plan:')
                    )
                  }
                >
                  <WandSparkles aria-hidden='true' />
                  {t('Create something')}
                </Button>
              </div>
            </div>
          ) : (
            <PlaygroundChat
              messages={messages}
              isGenerating={isGenerating}
              onRegenerateMessage={
                canSend ? conversation.handleRegenerateMessage : undefined
              }
              onEditMessage={conversation.handleEditMessage}
              onDeleteMessage={conversation.handleDeleteMessage}
              editingKey={conversation.editingMessageKey}
              onCancelEdit={conversation.handleEditOpenChange}
              onSaveEdit={(content) => conversation.applyEdit(content, false)}
              onSaveEditAndSubmit={
                canSend
                  ? (content) => conversation.applyEdit(content, true)
                  : undefined
              }
            />
          )}
          <div className='workbench-composer-area'>
            {!pricing.isPending && !pricing.isError && groups.length === 0 && (
              <p className='workbench-selection-notice' role='status'>
                {t(
                  'No chat models are available yet. You can prepare a draft while models are being configured.'
                )}
              </p>
            )}
            {user &&
              selection.group &&
              !userGroups.isPending &&
              !userModels.isPending &&
              !canSend &&
              !userModels.isFetching && (
                <p className='workbench-selection-notice' role='status'>
                  {t(
                    'Your selected model or route is unavailable for this account. Choose another option; we will not switch it automatically.'
                  )}
                </p>
              )}

            {selectionNotice && (
              <p className='workbench-selection-notice' role='alert'>
                {t(
                  'Choose an available route and model before sending. Your draft has not been sent.'
                )}
              </p>
            )}
            {(pricing.isError || userGroups.isError || userModels.isError) && (
              <div className='workbench-selection-notice' role='alert'>
                {t('Could not load available models. Your draft is safe.')}
                <Button
                  variant='link'
                  onClick={() => {
                    void pricing.refetch()
                    if (user) {
                      void userGroups.refetch()
                      if (selection.group) void userModels.refetch()
                    }
                  }}
                >
                  {t('Retry')}
                </Button>
              </div>
            )}
            <ChatComposer
              draft={draft}
              onDraftChange={updateDraft}
              onSubmit={submitDraft}
              isGenerating={isGenerating}
              onStop={stopGeneration}
            />
            <p className='workbench-cost-note'>
              {t(
                'Usage is charged to your wallet at the selected model and route rates. AI can make mistakes.'
              )}{' '}
              <Link to='/pricing'>{t('View pricing')}</Link>
            </p>
          </div>
        </section>
      </div>
      <WorkbenchAuthGate open={!user && authOpen} onOpenChange={setAuthOpen} />
    </WorkbenchShell>
  )
}
