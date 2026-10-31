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
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  BookOpen,
  Box,
  ChevronRight,
  CircleDollarSign,
  KeyRound,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { BrandWordmark } from '@/components/brand-wordmark'
import { Dialog } from '@/components/dialog'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import '@/styles/workbench.css'

interface WorkbenchShellProps {
  active: 'chat' | 'canvas'
  children: ReactNode
  trailing?: ReactNode
}

function WorkbenchNavigation(props: {
  active: WorkbenchShellProps['active']
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl =
    typeof status?.docs_link === 'string' && status.docs_link.trim()
      ? status.docs_link
      : 'https://docs.newapi.pro'
  return (
    <>
      <Link to='/' className='workbench-brand' onClick={props.onNavigate}>
        <BrandWordmark />
      </Link>
      <div className='workbench-nav-label'>{t('Workspace')}</div>
      <nav
        aria-label={t('Workspace navigation')}
        className='workbench-navigation'
      >
        <Link
          to='/chat'
          className='workbench-nav-item'
          aria-current={props.active === 'chat' ? 'page' : undefined}
          onClick={props.onNavigate}
        >
          <MessageSquare aria-hidden='true' />
          {t('Online AI chat')}
          <span className='workbench-live-dot' />
        </Link>
        <Link
          to='/canvas'
          className='workbench-nav-item'
          aria-current={props.active === 'canvas' ? 'page' : undefined}
          onClick={props.onNavigate}
        >
          <Box aria-hidden='true' />
          {t('Image creation canvas')}
        </Link>
        <Link
          to='/pricing'
          className='workbench-nav-item'
          onClick={props.onNavigate}
        >
          <CircleDollarSign aria-hidden='true' />
          {t('Model pricing')}
          <ArrowUpRight className='workbench-nav-external' aria-hidden='true' />
        </Link>
        <div className='workbench-nav-label'>{t('Console')}</div>
        <Link
          to='/keys'
          className='workbench-nav-item'
          onClick={props.onNavigate}
        >
          <KeyRound aria-hidden='true' />
          {t('API keys')}
        </Link>
        <Link
          to='/wallet'
          className='workbench-nav-item'
          onClick={props.onNavigate}
        >
          <Wallet aria-hidden='true' />
          {t('Wallet')}
        </Link>
        <Link
          to='/dashboard'
          className='workbench-nav-item'
          onClick={props.onNavigate}
        >
          <LayoutDashboard aria-hidden='true' />
          {t('Dashboard')}
        </Link>
        <a
          href={docsUrl}
          className='workbench-nav-item'
          target='_blank'
          rel='noreferrer'
          onClick={props.onNavigate}
        >
          <BookOpen aria-hidden='true' />
          {t('Documentation')}
          <ArrowUpRight className='workbench-nav-external' aria-hidden='true' />
        </a>
      </nav>
      <div className='workbench-sidebar-note'>
        <Sparkles aria-hidden='true' />
        <strong>{t('One workspace, more possibilities')}</strong>
        <p>{t('Explore models. Shape ideas. Start creating.')}</p>
        <Link to='/pricing' onClick={props.onNavigate}>
          {t('Explore models')}
          <ChevronRight aria-hidden='true' />
        </Link>
      </div>
      <div className='workbench-sidebar-footer'>
        <span className='workbench-live-dot' />
        {t('Built for your next idea')}
      </div>
    </>
  )
}

export function WorkbenchShell(props: WorkbenchShellProps) {
  const { t } = useTranslation()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const user = useAuthStore((state) => state.auth.user)
  const title =
    props.active === 'chat' ? t('Online AI chat') : t('Image creation canvas')
  return (
    <div className='workbench'>
      <aside className='workbench-sidebar'>
        <WorkbenchNavigation active={props.active} />
      </aside>
      <div className='workbench-main'>
        <header className='workbench-header'>
          <Button
            variant='ghost'
            size='icon'
            className='workbench-mobile-toggle'
            aria-label={t('Open workspace navigation')}
            aria-expanded={navigationOpen}
            onClick={() => setNavigationOpen(true)}
          >
            <Menu aria-hidden='true' />
          </Button>
          <div className='workbench-breadcrumb'>
            <span>{t('Workspace')}</span>
            <ChevronRight aria-hidden='true' />
            <strong>{title}</strong>
          </div>
          <div className='workbench-header-trailing'>
            {props.trailing}
            <ThemeSwitch />
            {user ? (
              <Link to='/wallet' className='workbench-account'>
                {user.display_name || user.username}
                <Wallet aria-hidden='true' />
              </Link>
            ) : (
              <Button
                variant='outline'
                render={
                  <Link
                    to='/sign-in'
                    search={{
                      redirect: props.active === 'chat' ? '/chat' : '/canvas',
                    }}
                  />
                }
              >
                {t('Sign in')}
                <ArrowUpRight aria-hidden='true' />
              </Button>
            )}
          </div>
        </header>
        <main className='workbench-content'>{props.children}</main>
      </div>
      <Dialog
        open={navigationOpen}
        onOpenChange={setNavigationOpen}
        title={t('Workspace navigation')}
        contentClassName='workbench workbench-navigation-dialog'
        bodyClassName='workbench-mobile-navigation'
      >
        <WorkbenchNavigation
          active={props.active}
          onNavigate={() => setNavigationOpen(false)}
        />
      </Dialog>
    </div>
  )
}
