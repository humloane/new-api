import { Activity } from 'lucide-react'

import { cn } from '@/lib/utils'

export const SERVICE_STATUS_URL = 'https://status.neaixt.com/status/aimoxt'

export function ServiceStatusLink({
  className,
  label = '服务状态',
}: {
  className?: string
  label?: string
}) {
  return (
    <a
      href={SERVICE_STATUS_URL}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors',
        className
      )}
      title='查看 AIMOXT 网站、API 与依赖服务的实时状态'
    >
      <Activity aria-hidden='true' className='size-3.5 text-emerald-500' />
      <span>{label}</span>
    </a>
  )
}
