import { Activity } from 'lucide-react'

import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

type StatusGroup = {
  categoryName?: string
  url?: string
  slug?: string
}

/**
 * Read the Uptime Kuma groups from `/api/status`.
 *
 * The groups are managed in 控制台内容 → Uptime Kuma, so the public status link
 * follows the same configuration as the dashboard uptime panel instead of
 * carrying its own hardcoded URL.
 */
function readStatusGroups(status: unknown): StatusGroup[] {
  const payload = status as
    | {
        uptime_kuma_groups?: unknown
        data?: { uptime_kuma_groups?: unknown }
      }
    | null
    | undefined
  const raw = payload?.uptime_kuma_groups ?? payload?.data?.uptime_kuma_groups
  return Array.isArray(raw) ? (raw as StatusGroup[]) : []
}

export function ServiceStatusLink({
  className,
  label = '服务状态',
}: {
  className?: string
  label?: string
}) {
  const { status } = useStatus()
  const group = readStatusGroups(status).find(
    (item) =>
      typeof item?.url === 'string' &&
      item.url.length > 0 &&
      typeof item?.slug === 'string' &&
      item.slug.length > 0
  )

  if (!group) return null

  const href = `${group.url!.replace(/\/+$/, '')}/status/${group.slug}`

  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors',
        className
      )}
      title={`查看 ${group.categoryName || '站点'} 的实时服务状态`}
    >
      <Activity aria-hidden='true' className='size-3.5 text-emerald-500' />
      <span>{label}</span>
    </a>
  )
}
