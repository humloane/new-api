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
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  Code2,
  KeyRound,
  Layers,
  MessageCircle,
  Route,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { getLobeIcon } from '@/lib/lobe-icon'

import type { LandingActions } from '../types'
import { SoleActions } from './sole-actions'

export function SoleSections(props: { actions: LandingActions }) {
  const { t } = useTranslation()
  const features = [
    {
      icon: Braces,
      title: t('An API that feels familiar'),
      description: t(
        'Connect compatible SDKs and tools with your Base URL, API key, and a supported model ID.'
      ),
      art: 'code',
    },
    {
      icon: Route,
      title: t('One place for model access'),
      description: t(
        'Explore the model catalog and switch between available models for different tasks.'
      ),
      art: 'route',
    },
    {
      icon: Wallet,
      title: t('Understand every request'),
      description: t(
        'Review token usage and request costs in the console. Check current model pricing before you build.'
      ),
      art: 'usage',
    },
    {
      icon: KeyRound,
      title: t('Keep your keys organized'),
      description: t(
        'Create separate API keys for your tools and projects, and manage them from the console.'
      ),
      art: 'key',
    },
    {
      icon: MessageCircle,
      title: t('An assistant, ready in your browser'),
      description: t(
        'Open the online AI assistant to start a conversation with your configured models.'
      ),
      art: 'chat',
    },
    {
      icon: Layers,
      title: t('Give your ideas more space'),
      description: t(
        'Use the infinite canvas to arrange ideas and explore a visual workspace.'
      ),
      art: 'canvas',
    },
  ]
  const before = [
    t('Separate API settings for every provider'),
    t('Keys spread across different tools'),
    t('Usage records in several dashboards'),
    t('Repeated setup when trying a new model'),
  ]
  const after = [
    t('A shared entry point for supported models'),
    t('API keys managed in one console'),
    t('Request usage and costs together'),
    t('Choose another model from the catalog'),
  ]
  const steps = [
    {
      title: t('Open your console'),
      body: t(
        'Sign in, check the available models, and review the current pricing.'
      ),
      icon: Sparkles,
    },
    {
      title: t('Create an API key'),
      body: t(
        'Create a key for your project and store it securely on your server.'
      ),
      icon: KeyRound,
    },
    {
      title: t('Connect your application'),
      body: t(
        'Set your Base URL, API key, and model ID in a compatible SDK or tool.'
      ),
      icon: Code2,
    },
    {
      title: t('Build, review, improve'),
      body: t(
        'Send a request, inspect the result, and follow usage in your console.'
      ),
      icon: Route,
    },
  ]
  const questions = [
    {
      question: t('What can I do with AIMOXT?'),
      answer: t(
        'AIMOXT provides a shared API entry point for models available to your account. You can integrate a supported model in your application, use the online AI assistant, or explore the infinite canvas.'
      ),
    },
    {
      question: t('Which models can I use?'),
      answer: t(
        'The model catalog shows the models, protocols, and prices currently available. Access can vary by account group and upstream availability. Check the catalog rather than relying on the illustrations on this page.'
      ),
    },
    {
      question: t('Can I keep using my existing SDK?'),
      answer: t(
        'For supported OpenAI-compatible endpoints, you can usually configure your existing SDK with the AIMOXT Base URL, your API key, and a supported model ID. Model-specific features and other protocols may need additional configuration.'
      ),
    },
    {
      question: t('Where can I check prices and usage?'),
      answer: t(
        'See the model catalog for current pricing and your console for request records and usage. Review the applicable model and account settings before sending requests. No free credit or fixed discount is promised on this page.'
      ),
    },
    {
      question: t('How should I handle API keys and sensitive data?'),
      answer: t(
        'Keep API keys on your server and out of public repositories or browser code. Review the applicable privacy terms and upstream provider policies before submitting sensitive data.'
      ),
    },
    {
      question: t('Are the charts on this page live?'),
      answer: t(
        'No. Cards marked Demo and all illustrated charts are interface examples. They do not represent live service status, measured latency, real usage, or an availability guarantee.'
      ),
    },
  ]

  return (
    <>
      <section
        className='sole-section sole-features'
        id='capabilities'
        aria-labelledby='sole-features-title'
      >
        <div className='sole-section-heading'>
          <span className='sole-overline'>{t('BUILT FOR YOUR NEXT IDEA')}</span>
          <h2 id='sole-features-title'>
            {t('From the first request')}
            <br />
            <span>{t('to your next big thing.')}</span>
          </h2>
          <p>
            {t(
              'A practical workspace for model access, API integration, and everyday creation.'
            )}
          </p>
        </div>
        <div className='sole-feature-grid'>
          {features.map((feature) => (
            <article className='sole-feature-card' key={feature.art}>
              <div
                className={`sole-feature-art sole-art-${feature.art}`}
                aria-hidden='true'
              >
                {feature.art === 'code' && (
                  <div className='sole-mini-terminal'>
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                    <code>
                      <em>-</em> base_url = provider_url
                      <br />
                      <b>+</b> base_url = aimoxt_url
                      <br />
                      <b>+</b> api_key = your_key
                    </code>
                  </div>
                )}
                {feature.art === 'route' && (
                  <div className='sole-mini-route'>
                    <span>{getLobeIcon('OpenAI', 24)}</span>
                    <i />
                    <img src='/brand/symbol.svg' alt='' />
                    <i />
                    <span>{getLobeIcon('DeepSeek.Color', 28)}</span>
                  </div>
                )}
                {feature.art === 'usage' && (
                  <div className='sole-mini-bars'>
                    <span>{t('Illustration')}</span>
                    <div>
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}
                {feature.art === 'key' && (
                  <div className='sole-mini-key'>
                    <KeyRound />
                    <code>sk-••••••••••••••</code>
                    <Check />
                  </div>
                )}
                {feature.art === 'chat' && (
                  <div className='sole-mini-chat'>
                    <span>
                      <Sparkles />
                      {t('Start with a question')}
                    </span>
                    <i />
                    <i />
                    <div>
                      <MessageCircle />
                      {t('Your next idea starts here')}
                      <ArrowUpRight />
                    </div>
                  </div>
                )}
                {feature.art === 'canvas' && (
                  <div className='sole-mini-canvas'>
                    <span>
                      <Layers />
                    </span>
                    <i />
                    <span>
                      <Braces />
                    </span>
                    <span>
                      <Sparkles />
                    </span>
                  </div>
                )}
              </div>
              <span className='sole-feature-icon'>
                <feature.icon aria-hidden='true' />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.art === 'chat' && (
                <Link className='sole-text-link' to='/chat'>
                  {t('Open AI assistant')}
                  <ArrowUpRight aria-hidden='true' />
                </Link>
              )}
              {feature.art === 'canvas' && (
                <Link className='sole-text-link' to='/canvas'>
                  {t('Open infinite canvas')}
                  <ArrowUpRight aria-hidden='true' />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
      <section
        className='sole-section sole-comparison'
        aria-labelledby='sole-comparison-title'
      >
        <div className='sole-section-heading'>
          <span className='sole-overline'>
            {t('LESS SETUP. MORE CREATING.')}
          </span>
          <h2 id='sole-comparison-title'>
            {t('Bring your AI workflow')}
            <br />
            <span>{t('into one place.')}</span>
          </h2>
          <p>
            {t(
              'Spend less time moving between provider settings and more time building your application.'
            )}
          </p>
        </div>
        <div className='sole-compare-grid'>
          <article className='sole-compare-card sole-before'>
            <span className='sole-compare-label'>
              {t('SEPARATE INTEGRATIONS')}
            </span>
            <h3>{t('More tabs. More moving parts.')}</h3>
            <ul>
              {before.map((item) => (
                <li key={item}>
                  <X aria-hidden='true' />
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article className='sole-compare-card sole-after'>
            <span className='sole-compare-label'>
              <img src='/brand/symbol.svg' alt='' />
              {t('WITH AIMOXT')}
            </span>
            <h3>{t('One place to keep building.')}</h3>
            <ul>
              {after.map((item) => (
                <li key={item}>
                  <Check aria-hidden='true' />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
      <section
        className='sole-section sole-integration'
        id='integration'
        aria-labelledby='sole-integration-title'
      >
        <div className='sole-section-heading'>
          <span className='sole-overline'>
            {t('YOUR FIRST REQUEST STARTS HERE')}
          </span>
          <h2 id='sole-integration-title'>
            {t('Four steps.')} <span>{t('Then make it yours.')}</span>
          </h2>
          <p>
            {t('A straightforward path from your account to your application.')}
          </p>
        </div>
        <div className='sole-steps'>
          {steps.map((step, index) => (
            <article className='sole-step' key={step.title}>
              <div className='sole-step-top'>
                <span className='sole-step-icon'>
                  <step.icon aria-hidden='true' />
                </span>
                <span className='sole-step-number' aria-hidden='true'>
                  0{index + 1}
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
        {props.actions.docsUrl && (
          <div className='sole-guide-link'>
            <Button
              role='link'
              variant='outline'
              className='sole-button sole-button-secondary'
              render={
                props.actions.docsUrl.startsWith('http') ? (
                  <a
                    href={props.actions.docsUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                ) : (
                  <Link to={props.actions.docsUrl} />
                )
              }
            >
              {t('Read the API documentation')}
              <ArrowUpRight aria-hidden='true' />
            </Button>
          </div>
        )}
      </section>
      <section
        className='sole-section sole-faq'
        id='faq'
        aria-labelledby='sole-faq-title'
      >
        <div className='sole-faq-intro'>
          <span className='sole-overline'>{t('A FEW THINGS TO KNOW')}</span>
          <h2 id='sole-faq-title'>
            {t('Good questions.')}
            <br />
            <span>{t('Clear answers.')}</span>
          </h2>
          <p>
            {t(
              'Get to know the workflow before you connect your first application.'
            )}
          </p>
          <a
            className='sole-text-link'
            href='https://t.me/moiusr'
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('Have another question?')}
            <ArrowUpRight aria-hidden='true' />
          </a>
        </div>
        <Accordion className='sole-accordion'>
          {questions.map((question) => (
            <AccordionItem value={question.question} key={question.question}>
              <AccordionTrigger>{question.question}</AccordionTrigger>
              <AccordionContent>{question.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <section className='sole-final-cta' aria-labelledby='sole-cta-title'>
        <div className='sole-cta-glow' aria-hidden='true' />
        <span className='sole-cta-symbol' aria-hidden='true'>
          <img src='/brand/symbol.svg' alt='' />
        </span>
        <span className='sole-overline'>
          {t('YOUR NEXT CHAPTER, POWERED BY AI')}
        </span>
        <h2 id='sole-cta-title'>
          {t('One connection.')}
          <br />
          <span>{t('A world of possibilities.')}</span>
        </h2>
        <p>{t('Bring your next idea to life with AIMOXT.')}</p>
        <SoleActions actions={props.actions} />
        <Link className='sole-cta-assistant' to='/chat'>
          {t('Or start with the online AI assistant')}
          <ArrowRight aria-hidden='true' />
        </Link>
      </section>
    </>
  )
}
