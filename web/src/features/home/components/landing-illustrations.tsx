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
import { Braces, Code2, KeyRound, Layers, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSystemConfig } from '@/hooks/use-system-config'
import { getLobeIcon } from '@/lib/lobe-icon'

const ECOSYSTEMS = [
  { name: 'OpenAI', icon: 'OpenAI' },
  { name: 'Claude', icon: 'Claude.Color' },
  { name: 'Gemini', icon: 'Gemini.Color' },
  { name: 'Grok', icon: 'Grok' },
  { name: 'DeepSeek', icon: 'DeepSeek.Color' },
  { name: 'Qwen', icon: 'Qwen.Color' },
]

export function ModelIllustration() {
  const { systemName } = useSystemConfig()
  return (
    <div className='landing-model-art' aria-hidden='true'>
      <div className='landing-orbit landing-orbit-outer' />
      <div className='landing-orbit landing-orbit-inner' />
      <div className='landing-art-core'>
        <Braces />
        <strong>妙信AI</strong>
        <span>{systemName}</span>
      </div>
      {ECOSYSTEMS.slice(0, 5).map((model, index) => (
        <div
          className={`landing-model-node landing-model-node-${index}`}
          key={model.name}
        >
          {getLobeIcon(model.icon, 38)}
          <span>{model.name}</span>
        </div>
      ))}
      <div className='landing-art-code'>
        <Code2 />
        <code>model: YOUR_MODEL_ID</code>
      </div>
      <span className='landing-art-spark landing-art-spark-one'>✦</span>
      <span className='landing-art-spark landing-art-spark-two'>✦</span>
    </div>
  )
}

export function PlatformBar() {
  const { t } = useTranslation()
  return (
    <div className='landing-container landing-platform-wrap'>
      <div className='landing-platform-bar'>
        <p>{t('One gateway, familiar ecosystems')}</p>
        <ul aria-label={t('Compatible ecosystems')}>
          {ECOSYSTEMS.slice(0, 5).map((model) => (
            <li key={model.name}>
              <span aria-hidden='true'>{getLobeIcon(model.icon, 25)}</span>
              <span>{model.name}</span>
            </li>
          ))}
          <li>
            <Braces aria-hidden='true' />
            <span>API</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export function EcosystemTiles() {
  const { t } = useTranslation()
  return (
    <section
      className='landing-container landing-ecosystems'
      aria-label={t('Compatible ecosystems')}
    >
      <ul>
        {ECOSYSTEMS.map((model) => (
          <li key={model.name}>
            <span aria-hidden='true'>{getLobeIcon(model.icon, 32)}</span>
            <span>{model.name}</span>
          </li>
        ))}
      </ul>
      <p>
        {t(
          'Available models and protocols depend on the catalog and your access group.'
        )}
      </p>
    </section>
  )
}

export function ModelCards() {
  return (
    <div className='landing-model-cards' aria-hidden='true'>
      {ECOSYSTEMS.slice(0, 3).map((model) => (
        <div key={model.name} className='landing-model-card'>
          {getLobeIcon(model.icon, 44)}
          <strong>{model.name}</strong>
          <span>API</span>
          <div className='landing-card-lines'>
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LaptopIllustration() {
  const { t } = useTranslation()
  return (
    <div className='landing-laptop-art' aria-hidden='true'>
      <div className='landing-laptop-screen'>
        <div className='landing-window-bar'>
          <i />
          <i />
          <i />
          <span>API</span>
        </div>
        <div className='landing-laptop-content'>
          <div className='landing-laptop-sidebar'>
            <Braces />
            <Code2 />
            <KeyRound />
            <Layers />
          </div>
          <div className='landing-laptop-editor'>
            <Code2 />
            <strong>{t('Make your first request')}</strong>
            <code>
              API_BASE_URL
              <br />
              API_KEY
              <br />
              YOUR_MODEL_ID
            </code>
            <div className='landing-card-lines'>
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </div>
      <div className='landing-laptop-base' />
      <div className='landing-key-tile'>
        <KeyRound />
      </div>
    </div>
  )
}

export function RoutingIllustration() {
  const { systemName } = useSystemConfig()
  const { t } = useTranslation()
  return (
    <div className='landing-routing-art' aria-hidden='true'>
      <div className='landing-routing-source'>
        <MessagesSquare />
        <Code2 />
        <span>{t('Developer tools')}</span>
      </div>
      <div className='landing-routing-wire' />
      <div className='landing-routing-gateway'>
        <Braces />
        <strong>{systemName}</strong>
        <span>API</span>
      </div>
      <div className='landing-routing-wire' />
      <div className='landing-routing-models'>
        {ECOSYSTEMS.slice(0, 3).map((model) => (
          <span key={model.name}>
            {getLobeIcon(model.icon, 25)}
            {model.name}
          </span>
        ))}
      </div>
    </div>
  )
}
