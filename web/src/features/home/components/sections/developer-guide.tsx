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
import {
  BookOpen,
  ArrowRight,
  Code2,
  Compass,
  FileText,
  KeyRound,
  Layers,
  MessagesSquare,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

import { HeroTerminalDemo } from '../hero-terminal-demo'
import { RoutingIllustration } from '../landing-illustrations'

export function ProtocolGuide() {
  const { t } = useTranslation()
  const protocols = [
    {
      name: 'Chat Completions',
      path: '/v1/chat/completions',
      body: t(
        'Message-based conversations for compatible SDKs and applications. Check the selected model before using tools, images or structured output.'
      ),
    },
    {
      name: 'Responses',
      path: '/v1/responses',
      body: t(
        'A separate request and response format for supported models. Chat Completions parameters are not interchangeable with Responses parameters.'
      ),
    },
    {
      name: 'Anthropic Messages',
      path: '/v1/messages',
      body: t(
        'Use the Messages request format and API-key header. Model access and advanced features depend on the configured channel.'
      ),
    },
    {
      name: 'Gemini',
      path: '/v1beta/models/{model}:generateContent',
      body: t(
        'Use the contents format and choose the correct model in the URL. Verify supported input types and streaming methods before integration.'
      ),
    },
  ]
  return (
    <section
      id='protocols'
      aria-labelledby='protocols-title'
      className='landing-container landing-editorial-row scroll-mt-24'
    >
      <div>
        <p className='landing-eyebrow'>{t('Compatible protocols')}</p>
        <h2 id='protocols-title' className='landing-section-title'>
          {t('Choose the interface, then the model.')}
        </h2>
        <p className='landing-body'>
          {t(
            'One gateway does not mean one universal request format. Start with the protocol your application uses, then check model availability and permissions in the catalog.'
          )}
        </p>
        <Accordion className='mt-5'>
          {protocols.map((protocol) => (
            <AccordionItem key={protocol.name} value={protocol.name}>
              <AccordionTrigger className='py-2.5 text-sm'>
                {protocol.name}
              </AccordionTrigger>
              <AccordionContent keepMounted className='pb-3'>
                <code className='landing-endpoint'>{protocol.path}</code>
                <p className='landing-body'>{protocol.body}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className='landing-note mt-4'>
          {t(
            'Protocol compatibility is not a promise that every upstream feature is available.'
          )}
        </p>
      </div>
      <RoutingIllustration />
    </section>
  )
}

export function UseCases() {
  const { t } = useTranslation()
  const cases = [
    {
      icon: MessagesSquare,
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      title: t('Product conversations'),
      body: t(
        'Build an assistant into your application. Evaluate conversation quality, context limits and streaming behavior with representative prompts before release.'
      ),
    },
    {
      icon: FileText,
      color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
      title: t('Content workflows'),
      body: t(
        'Summarize, classify and rewrite content with a model that fits the task. Validate structured output and handle incomplete or unexpected responses in your application.'
      ),
    },
    {
      icon: Code2,
      color: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300',
      title: t('Developer tools'),
      body: t(
        'Connect tools that accept a custom API endpoint. Match their protocol and model settings; support for one endpoint does not guarantee compatibility with every agent or IDE.'
      ),
    },
    {
      icon: BookOpen,
      color: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
      title: t('Knowledge applications'),
      body: t(
        'Combine retrieval with model generation in your own application. Check embedding and generation model availability separately, and keep document access controls in your system.'
      ),
    },
  ]
  return (
    <section
      id='use-cases'
      aria-labelledby='use-cases-title'
      className='landing-container landing-use-cases scroll-mt-24'
    >
      <div className='landing-use-cases-copy'>
        <p className='landing-eyebrow'>{t('Built for developers')}</p>
        <h2 id='use-cases-title' className='landing-section-title'>
          {t('From a first experiment to your application.')}
        </h2>
        <p className='landing-body'>
          {t(
            'Explore the catalog, connect your application, and manage access from one console.'
          )}
        </p>
        <a href='#integration' className='landing-guide-action'>
          {t('Integration guide')}
          <ArrowRight aria-hidden='true' />
        </a>
        <nav aria-label={t('On this page')} className='landing-page-nav'>
          {[
            ['#protocols', t('Compatible protocols')],
            ['#use-cases', t('Use cases')],
            ['#integration', t('Integration guide')],
            ['#faq', t('FAQ')],
          ].map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div>
        <div className='landing-use-case-grid'>
          {cases.map((useCase) => (
            <article key={useCase.title} className='landing-use-case'>
              <span
                className={cn(
                  'mb-6 inline-flex size-12 items-center justify-center rounded-2xl',
                  useCase.color
                )}
              >
                <useCase.icon
                  aria-hidden='true'
                  className='size-6'
                  strokeWidth={1.5}
                />
              </span>
              <h3 className='font-semibold'>{useCase.title}</h3>
              <p className='text-muted-foreground mt-3 text-sm leading-7'>
                {useCase.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function IntegrationGuide(props: { serverAddress: string }) {
  const { t } = useTranslation()
  const fields = [
    {
      icon: Compass,
      title: 'Base URL',
      body: t(
        'Use the API server address configured for this site. An OpenAI-compatible SDK commonly expects a base URL ending in /v1; a raw HTTP request needs the complete endpoint. Do not append /v1 twice.'
      ),
    },
    {
      icon: KeyRound,
      title: 'API Key',
      body: t(
        'Create a separate key for each application and keep it in a server-side environment variable. Never publish a working key in browser code, screenshots or a repository. Revoke exposed keys.'
      ),
    },
    {
      icon: Layers,
      title: t('Model ID'),
      body: t(
        'Copy the exact model identifier from the current catalog. Provider names are not model IDs. Availability, permissions and supported parameters can differ between models and access groups.'
      ),
    },
  ]
  return (
    <section
      id='integration'
      aria-labelledby='integration-title'
      className='landing-container landing-editorial-row landing-integration scroll-mt-24'
    >
      <div className='min-w-0'>
        <HeroTerminalDemo serverAddress={props.serverAddress} />
      </div>
      <div>
        <p className='landing-eyebrow'>{t('Your first API call')}</p>
        <h2 id='integration-title' className='landing-section-title'>
          {t('Three settings. One small test.')}
        </h2>
        <Accordion className='mt-5'>
          {fields.map((field) => (
            <AccordionItem key={field.title} value={field.title}>
              <AccordionTrigger className='py-3 text-sm'>
                <span className='flex items-center gap-3'>
                  <field.icon aria-hidden='true' className='size-4' />
                  {field.title}
                </span>
              </AccordionTrigger>
              <AccordionContent keepMounted className='landing-body pb-4'>
                {field.body}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className='landing-body mt-5'>
          {t(
            'Start with a short request and a small output limit. Check the response and usage log before enabling streaming, concurrency or larger workloads. A successful test validates that configuration, not every model or feature.'
          )}
        </p>
      </div>
    </section>
  )
}

export function LandingFAQ() {
  const { t } = useTranslation()
  const questions = [
    [
      t('Which models can I use?'),
      t(
        'Use the current model catalog and your account permissions as the source of truth. The ecosystem names on this page describe compatibility, not a guaranteed list of models available to every account.'
      ),
    ],
    [
      t('Can I keep my existing SDK?'),
      t(
        'Often, when the SDK accepts a custom endpoint and the selected model supports its protocol. Configure the base URL, key and model together. Check tool calling, files, caching and multimodal features individually.'
      ),
    ],
    [
      t('How do I investigate a failed request?'),
      t(
        'Check the response body and request log first. For 401, verify the key and authentication header; for 403, check access permissions; for 429, inspect rate or quota limits. These are starting points, not exhaustive diagnoses. Do not share your key when reporting an error.'
      ),
    ],
    [
      t('Does every model support streaming?'),
      t(
        'No. Streaming depends on the model, protocol and channel. Use the documented streaming method, handle interrupted connections, and test with your actual client before enabling it for users.'
      ),
    ],
    [
      t('Where do I check prices and usage?'),
      t(
        'Review the current model pricing and the information shown in your account before sending requests. Availability and pricing can vary by access group. This page does not quote fixed prices, discounts, payment methods or refund terms.'
      ),
    ],
    [
      t('What should I check before production?'),
      t(
        'Protect keys, set application limits, validate errors and review the configured service terms and privacy policy. Gateway routing does not by itself guarantee uptime, data retention rules or support for every upstream feature.'
      ),
    ],
  ]
  return (
    <section
      id='faq'
      aria-labelledby='faq-title'
      className='landing-faq scroll-mt-24'
    >
      <div className='landing-container'>
        <h2 id='faq-title' className='landing-section-title text-center'>
          {t('Before your first request')}
        </h2>
        <p className='landing-body text-center'>
          {t(
            'Practical answers about integration, access and service boundaries.'
          )}
        </p>
        <div className='landing-faq-grid'>
          {[
            {
              title: t('Compatible protocols'),
              icon: Code2,
              entries: [questions[1], questions[3]],
            },
            {
              title: t('Control your API access'),
              icon: KeyRound,
              entries: [questions[0], questions[5]],
            },
            {
              title: t('Usage visibility'),
              icon: FileText,
              entries: [questions[2], questions[4]],
            },
          ].map((group) => (
            <article className='landing-faq-card' key={group.title}>
              <span className='landing-faq-icon'>
                <group.icon aria-hidden='true' />
              </span>
              <h3>{group.title}</h3>
              <Accordion>
                {group.entries.map(([question, answer], index) => (
                  <AccordionItem key={question} value={`landing-faq-${index}`}>
                    <AccordionTrigger className='py-4 text-sm'>
                      {question}
                    </AccordionTrigger>
                    <AccordionContent
                      keepMounted
                      className='text-muted-foreground pb-5 text-sm leading-7'
                    >
                      {answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
