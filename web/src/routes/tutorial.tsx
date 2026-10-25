import { createFileRoute } from '@tanstack/react-router'

import { TutorialPage } from '@/features/tutorial'

export const Route = createFileRoute('/tutorial')({
  component: TutorialPage,
})
