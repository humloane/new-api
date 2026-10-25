import { Check, Copy, ExternalLink, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PublicLayout } from '@/components/layout'

const API_BASE = 'https://www.aimoxt.com'
const OPENAI_BASE = `${API_BASE}/v1`

const toc = [
  ['prepare', '环境准备'],
  ['key', '创建 API Key'],
  ['ccswitch', 'CC Switch 导入'],
  ['claude', 'Claude Code'],
  ['codex', 'Codex CLI'],
  ['gemini', 'Gemini CLI'],
  ['other', '其他客户端'],
  ['faq', '常见问题'],
  ['security', '安全建议'],
] as const

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className='overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-sm'>
      <div className='flex items-center justify-between border-b border-slate-800 px-4 py-2.5'>
        <span className='font-mono text-[11px] tracking-wide text-slate-400 uppercase'>
          {label}
        </span>
        <button
          type='button'
          onClick={copy}
          className='inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white'
        >
          {copied ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className='overflow-x-auto p-4 text-[12px] leading-6'>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Field({ name, value, note }: { name: string; value: string; note: string }) {
  return (
    <div className='grid gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4'>
      <code className='text-foreground text-xs font-semibold'>{name}</code>
      <div>
        <p className='text-sm'>{value}</p>
        <p className='text-muted-foreground mt-0.5 text-xs'>{note}</p>
      </div>
    </div>
  )
}

function Section({
  id,
  index,
  eyebrow,
  title,
  children,
}: {
  id: string
  index: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className='scroll-mt-24'>
      <p className='text-primary mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase'>
        {index} / {eyebrow}
      </p>
      <h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>{title}</h2>
      <div className='text-muted-foreground mt-4 space-y-5 text-sm leading-7'>
        {children}
      </div>
    </section>
  )
}

export function TutorialPage() {
  useEffect(() => {
    const previous = document.title
    document.title = '使用教程 - AIMOXT 妙信AI'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <PublicLayout showMainContainer={false}>
      <div className='bg-background min-h-svh pt-20'>
        <header className='border-border/60 border-b'>
          <div className='mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16'>
            <p className='text-primary font-mono text-[11px] font-semibold tracking-[0.2em] uppercase'>
              AIMOXT DOCS / 使用教程
            </p>
            <h1 className='mt-4 text-4xl font-bold tracking-tight sm:text-6xl'>
              使用教程
            </h1>
            <p className='text-muted-foreground mt-5 max-w-2xl text-base leading-8'>
              从本地环境到 AI 编程工具，按步骤接入 AIMOXT 统一 API 网关。只需一枚 Key，就可以调用模型广场中已上架的模型。
            </p>

            <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center'>
              <div className='border-border bg-muted/30 flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5'>
                <span className='text-muted-foreground shrink-0 text-xs'>API 地址</span>
                <code className='truncate font-mono text-xs'>{API_BASE}</code>
                <button
                  type='button'
                  aria-label='复制 API 地址'
                  onClick={() => navigator.clipboard?.writeText(API_BASE)}
                  className='text-muted-foreground hover:text-foreground shrink-0'
                >
                  <Copy className='size-3.5' />
                </button>
              </div>
              <a
                href='/keys'
                className='bg-foreground text-background inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold'
              >
                <KeyRound className='size-4' />
                获取 API Key
              </a>
            </div>

            <div className='mt-10 grid gap-3 sm:grid-cols-3'>
              {[
                ['01', '准备账号', '登录控制台，确认余额与可用分组。'],
                ['02', '创建 Key', '在 API 密钥页创建并保存密钥。'],
                ['03', '选择工具', '按下方教程配置 CLI 或客户端。'],
              ].map(([num, title, body]) => (
                <div key={num} className='border-border bg-card rounded-xl border p-4'>
                  <span className='text-primary font-mono text-[11px]'>{num}</span>
                  <p className='mt-2 text-sm font-semibold'>{title}</p>
                  <p className='text-muted-foreground mt-1 text-xs leading-5'>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className='mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]'>
          <aside className='hidden lg:block'>
            <div className='sticky top-24'>
              <p className='text-muted-foreground mb-3 font-mono text-[10px] tracking-[0.18em] uppercase'>
                本页目录
              </p>
              <nav className='space-y-1'>
                {toc.map(([id, label], i) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className='text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors'
                  >
                    <span className='text-muted-foreground/60 font-mono text-[10px]'>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {label}
                  </a>
                ))}
              </nav>
              <div className='border-border bg-muted/30 mt-6 rounded-xl border p-4'>
                <p className='text-sm font-semibold'>配置遇到问题？</p>
                <a
                  href='https://t.me/moiusr'
                  target='_blank'
                  rel='noreferrer'
                  className='text-primary mt-2 inline-flex items-center gap-1 text-xs'
                >
                  联系技术支持 <ExternalLink className='size-3' />
                </a>
              </div>
            </div>
          </aside>

          <main className='min-w-0 space-y-14'>
            <Section id='prepare' index='01' eyebrow='PREPARATION' title='环境准备'>
              <p>
                Claude Code、Codex CLI 和 Gemini CLI 都可以通过 npm 安装。建议使用 Node.js 20 LTS 或更高版本，安装完成后重新打开终端。
              </p>
              <CodeBlock
                label='terminal'
                code={`node -v\nnpm -v\n# 建议 Node.js >= v20\n\n# 如果还没有 Node.js：\n# macOS / Linux 推荐 nvm\n# Windows 可到 nodejs.org 下载 LTS 安装包`}
              />
            </Section>

            <Section id='key' index='02' eyebrow='API KEY' title='创建 API Key'>
              <p>
                登录控制台后进入 <a className='text-primary underline' href='/keys'>API 密钥</a>，点击“创建密钥”。建议为每个应用单独创建一枚 Key，并设置额度、过期时间和模型范围。
              </p>
              <div className='border-border bg-card rounded-xl border p-4'>
                <Field name='Base URL' value={OPENAI_BASE} note='OpenAI 兼容客户端填写 /v1 结尾地址。' />
                <Field name='API Key' value='<AIMOXT_API_KEY>' note='只在服务端环境变量中使用，不要写进前端代码。' />
                <Field name='Model ID' value='gpt-5.6-sol' note='以模型广场当前展示的模型 ID 为准。' />
              </div>
              <div className='border-border bg-muted/30 rounded-xl border p-4 text-xs leading-6'>
                <strong className='text-foreground'>提示：</strong>
                密钥创建后通常只完整显示一次。请立即保存到密码管理器或服务端环境变量；如果泄露，请在控制台禁用并重新创建。
              </div>
            </Section>

            <Section id='ccswitch' index='03' eyebrow='CC SWITCH' title='用 CC Switch 一键导入'>
              <p>
                CC Switch 可以集中管理多种 AI 编程工具的供应商配置。AIMOXT 的密钥列表提供 CC Switch 导入入口，适合不想手动编辑配置文件的用户。
              </p>
              <ol className='list-decimal space-y-2 pl-5'>
                <li>从 CC Switch 官方 Releases 安装并启动客户端。</li>
                <li>在 AIMOXT 控制台进入“API 密钥”，在目标密钥的操作菜单中选择“CC Switch”。</li>
                <li>核对应用类型、API 端点、模型和密钥掩码后确认导入。</li>
                <li>回到 CC Switch 启用该供应商，再重启对应 CLI。</li>
              </ol>
              <div className='flex flex-wrap gap-3 text-xs'>
                <a className='text-primary inline-flex items-center gap-1 underline' href='https://github.com/farion1231/cc-switch/releases/latest' target='_blank' rel='noreferrer'>
                  CC Switch Releases <ExternalLink className='size-3' />
                </a>
                <a className='text-primary inline-flex items-center gap-1 underline' href='https://github.com/farion1231/cc-switch' target='_blank' rel='noreferrer'>
                  CC Switch 项目 <ExternalLink className='size-3' />
                </a>
              </div>
            </Section>

            <Section id='claude' index='04' eyebrow='CLAUDE CODE' title='Claude Code 配置'>
              <p>
                安装 Anthropic 官方命令行工具，并把请求地址和令牌指向 AIMOXT。Claude Code 走 Anthropic Messages 兼容入口，实际可用模型仍以模型广场和你的分组为准。
              </p>
              <CodeBlock label='npm' code={`npm install -g @anthropic-ai/claude-code\nclaude --version`} />
              <p>
                将以下内容写入用户目录的 <code>~/.claude/settings.json</code>（Windows 为 <code>%USERPROFILE%\\.claude\\settings.json</code>）：
              </p>
              <CodeBlock
                label='json'
                code={`{
  "env": {
    "ANTHROPIC_BASE_URL": "${API_BASE}",
    "ANTHROPIC_AUTH_TOKEN": "<AIMOXT_API_KEY>",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_MODEL": "gpt-5.6-sol",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "gpt-5.6-sol",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "gpt-5.6-terra",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gpt-5.6-luna",
    "CLAUDE_CODE_SUBAGENT_MODEL": "gpt-5.6-luna"
  }
}`}
              />
              <p className='text-xs'>
                然后进入项目目录运行 <code>claude</code>。如果提示模型不存在，请到模型广场复制当前可用的模型 ID。
              </p>
            </Section>

            <Section id='codex' index='05' eyebrow='CODEX CLI' title='Codex CLI 配置'>
              <p>
                Codex CLI 通过 OpenAI 兼容接口接入。先安装 CLI，再写入 <code>~/.codex/config.toml</code> 和 <code>~/.codex/auth.json</code>。
              </p>
              <CodeBlock label='npm' code={`npm install -g @openai/codex@latest\ncodex --version`} />
              <CodeBlock
                label='config.toml'
                code={`model = "gpt-5.6-sol"
model_provider = "aimoxt"
model_reasoning_effort = "xhigh"

[model_providers.aimoxt]
name = "AIMOXT"
base_url = "${OPENAI_BASE}"
wire_api = "responses"
requires_openai_auth = true
experimental_bearer_token = "<AIMOXT_API_KEY>"
supports_websockets = false`}
              />
              <CodeBlock
                label='auth.json'
                code={`{
  "OPENAI_API_KEY": "<AIMOXT_API_KEY>",
  "auth_mode": "apikey"
}`}
              />
              <p className='text-xs'>
                保存后进入项目目录运行 <code>codex</code>。如果使用 Chat Completions 而不是 Responses，请把 <code>wire_api</code> 改为 <code>chat</code>。
              </p>
            </Section>

            <Section id='gemini' index='06' eyebrow='GEMINI CLI' title='Gemini CLI 配置'>
              <p>
                Gemini CLI 可以读取用户目录的 <code>~/.gemini/.env</code>。将下面三项写入该文件即可，无需修改系统环境变量。
              </p>
              <CodeBlock label='npm' code={`npm install -g @google/gemini-cli\ngemini --version`} />
              <CodeBlock
                label='~/.gemini/.env'
                code={`GEMINI_API_KEY=<AIMOXT_API_KEY>\nGOOGLE_GEMINI_BASE_URL=${API_BASE}\nGEMINI_MODEL=gpt-5.6-sol`}
              />
              <p className='text-xs'>
                Gemini CLI 走 Gemini 兼容入口；如果当前分组未启用该入口，请改用 Codex 或其他 OpenAI 兼容客户端。
              </p>
            </Section>

            <Section id='other' index='07' eyebrow='TOOLS' title='其他客户端'>
              <p>
                大多数支持“自定义 OpenAI API 地址”的客户端都可以接入。只需要填三个值：
              </p>
              <div className='grid gap-3 sm:grid-cols-2'>
                {[
                  ['Cherry Studio', '设置 → 模型服务 → OpenAI → 自定义地址'],
                  ['LobeChat', '语言模型 → OpenAI → 自定义 API 代理'],
                  ['Chatbox', '设置 → 模型提供方 → 自定义 OpenAI'],
                  ['Cursor / VS Code', '选择 OpenAI Compatible，填 Base URL 和 Key'],
                ].map(([name, path]) => (
                  <div key={name} className='border-border bg-card rounded-xl border p-4'>
                    <p className='text-sm font-semibold'>{name}</p>
                    <p className='text-muted-foreground mt-1 text-xs leading-5'>{path}</p>
                  </div>
                ))}
              </div>
              <CodeBlock
                label='通用配置'
                code={`Base URL: ${OPENAI_BASE}\nAPI Key:  <AIMOXT_API_KEY>\nModel:    gpt-5.6-sol`}
              />
            </Section>

            <Section id='faq' index='08' eyebrow='FAQ' title='常见问题'>
              <div className='space-y-4'>
                {[
                  ['401 Invalid token', '检查 Key 是否完整、是否已禁用，以及 Authorization 头是否为 Bearer 格式。'],
                  ['403 / 无权限', '检查密钥的模型限制、分组权限和余额；必要时在控制台调整。'],
                  ['429 限流', '降低并发或检查 RPM/TPM 限制，稍后重试；不要用高频重试冲击上游。'],
                  ['404 model not found', '到模型广场复制准确模型 ID；模型名称不是供应商名称。'],
                  ['流式响应中断', '检查客户端是否支持 SSE、代理是否缓冲响应，以及超时设置。'],
                  ['余额与用量', '在控制台的“钱包”和“使用日志”查看余额、请求记录和扣费明细。'],
                ].map(([q, a]) => (
                  <div key={q} className='border-border border-b pb-4 last:border-0'>
                    <p className='text-foreground text-sm font-semibold'>{q}</p>
                    <p className='text-muted-foreground mt-1 text-sm leading-7'>{a}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id='security' index='09' eyebrow='SECURITY' title='安全建议'>
              <ul className='list-disc space-y-2 pl-5'>
                <li>每枚 Key 只给一个应用使用，按应用设置额度和过期时间。</li>
                <li>Key 放在服务端环境变量或密钥管理器中，不要提交到 Git、截图或浏览器代码。</li>
                <li>怀疑泄露时立即在控制台禁用并重新创建，不要只修改密码。</li>
                <li>生产环境为不同环境（开发/测试/生产）使用不同 Key。</li>
                <li>定期查看使用日志，发现异常请求及时禁用 Key 并联系客服。</li>
              </ul>
            </Section>

            <div className='border-border bg-muted/30 rounded-2xl border p-6 sm:p-8'>
              <h2 className='text-xl font-bold'>配置完成，开始构建</h2>
              <p className='text-muted-foreground mt-2 text-sm leading-7'>
                如果按教程配置后仍然无法调用，请把错误信息、请求 ID 和使用的客户端发给客服，不要发送完整 API Key。
              </p>
              <div className='mt-4 flex flex-wrap gap-3'>
                <a href='/keys' className='bg-foreground text-background inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold'>
                  打开控制台
                </a>
                <a href='https://t.me/moiusr' target='_blank' rel='noreferrer' className='border-border inline-flex h-9 items-center gap-1 rounded-lg border px-4 text-sm'>
                  联系技术支持 <ExternalLink className='size-3.5' />
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </PublicLayout>
  )
}
