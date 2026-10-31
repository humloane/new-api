import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'

import { ThemeProvider, useTheme } from '@/context/theme-provider'

import { BrandWordmark } from '../brand-wordmark'

function Switcher() {
  const { setTheme } = useTheme()
  return (
    <>
      <BrandWordmark />
      <button type='button' onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button type='button' onClick={() => setTheme('light')}>
        Light
      </button>
    </>
  )
}
afterEach(() => {
  cleanup()
  localStorage.clear()
})
test('switching appearance selects the complete contrasting horizontal artwork', async () => {
  render(
    <ThemeProvider defaultTheme='light'>
      <Switcher />
    </ThemeProvider>
  )
  const image = screen.getByRole('img', { name: '妙信AI · AIMOXT' })
  expect(image).toHaveAttribute('src', '/brand/logo-light.svg?v=5')
  await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
  expect(image).toHaveAttribute('src', '/brand/logo-dark.svg?v=5')
  await userEvent.click(screen.getByRole('button', { name: 'Light' }))
  expect(image).toHaveAttribute('src', '/brand/logo-light.svg?v=5')
})
