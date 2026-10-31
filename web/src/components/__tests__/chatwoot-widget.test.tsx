import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { ChatwootWidget } from '../chatwoot-widget'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document
    .querySelectorAll(
      '[data-aimoxt-chatwoot], .woot--bubble-holder, .woot-widget-holder'
    )
    .forEach((node) => node.remove())
  delete window.$chatwoot
  delete window.chatwootSDK
})

test('leaving a public page closes and hides support widgets that live outside React', () => {
  window.$chatwoot = { toggle: vi.fn(), toggleBubbleVisibility: vi.fn() }
  const view = render(<ChatwootWidget />)
  view.unmount()
  expect(window.$chatwoot.toggle).toHaveBeenCalledWith('close')
  expect(window.$chatwoot.toggleBubbleVisibility).toHaveBeenCalledWith('hide')
})

test('SDK finishing after navigation cannot reopen a hidden support widget', () => {
  vi.useFakeTimers()
  const run = vi.fn()
  window.chatwootSDK = { run }
  const view = render(<ChatwootWidget />)
  vi.runAllTimers()
  const script = document.querySelector<HTMLScriptElement>(
    'script[data-aimoxt-chatwoot]'
  )
  expect(script).not.toBeNull()
  view.unmount()
  script?.dispatchEvent(new Event('load'))
  expect(run).not.toHaveBeenCalled()
})

test('returning to a public page shows the existing support widget again', () => {
  window.$chatwoot = { toggle: vi.fn(), toggleBubbleVisibility: vi.fn() }
  const first = render(<ChatwootWidget />)
  first.unmount()
  expect(document.documentElement).toHaveAttribute('data-support-hidden')
  render(<ChatwootWidget />)
  expect(document.documentElement).not.toHaveAttribute('data-support-hidden')
  expect(window.$chatwoot.toggleBubbleVisibility).toHaveBeenLastCalledWith(
    'show'
  )
})
