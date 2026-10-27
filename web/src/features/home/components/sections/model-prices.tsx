import { ArrowUpRight } from 'lucide-react'

const MODELS = [
  {
    name: 'DeepSeek V4.1 Flash',
    tag: '国产 · 经济档',
    input: '¥0.2',
    output: '¥0.8',
    fit: '客服 / 写作 / 批量处理',
  },
  {
    name: 'DeepSeek V4 Pro',
    tag: '国产 · 经济档',
    input: '¥0.9',
    output: '¥2.7',
    fit: '推理 / Agent / 代码',
  },
  {
    name: 'GLM-5.3',
    tag: '国产 · 稳定档',
    input: '¥1.6',
    output: '¥5.6',
    fit: '中文 / 工具调用 / 长文本',
  },
  {
    name: 'Kimi K3',
    tag: '国产 · 旗舰档',
    input: '¥4',
    output: '¥20',
    fit: '长文档 / 深度分析',
  },
  {
    name: 'MiniMax M3',
    tag: '国产 · 经济档',
    input: '¥0.42',
    output: '¥1.68',
    fit: '长上下文 / 多模态',
  },
  {
    name: 'Qwen3.8 Max',
    tag: '国产 · 旗舰档',
    input: '¥1.6',
    output: '¥4.8',
    fit: '多语言 / 复杂推理',
  },
  {
    name: 'GPT-5.6 Sol',
    tag: 'GPT · 经济档',
    input: '¥0.6 起',
    output: '¥3 起',
    fit: '通用 / 编程 / Agent',
  },
  {
    name: 'GPT-6 Astra',
    tag: 'GPT · 经济档',
    input: '¥1.5 起',
    output: '¥7.5 起',
    fit: '复杂分析 / 高质量生成',
  },
  {
    name: 'Claude Sonnet 5.5',
    tag: 'Claude · 稳定档',
    input: '¥3.4',
    output: '¥17',
    fit: '对话 / 编码 / 长上下文',
  },
  {
    name: 'Claude Opus 5.5',
    tag: 'Claude · 旗舰档',
    input: '¥6.8',
    output: '¥34',
    fit: '复杂推理 / 长时代理',
  },
]

export function ModelPrices() {
  return (
    <section
      id='models'
      aria-labelledby='landing-models'
      className='landing-container landing-model-prices scroll-mt-24'
    >
      <div className='landing-model-prices-head'>
        <div>
          <p className='landing-eyebrow'>模型与价格</p>
          <h2 id='landing-models' className='landing-section-title'>
            一张表，先看清主流模型的价格
          </h2>
          <p className='landing-body'>
            覆盖 GPT、Claude、DeepSeek、GLM、Kimi、Qwen、MiniMax；价格为当前最低分组参考价，
            单位元 / 百万 tokens，实际以模型广场实时价格为准。
          </p>
        </div>
        <a href='/pricing' className='landing-model-prices-link'>
          查看完整模型广场
          <ArrowUpRight aria-hidden='true' className='size-3.5' />
        </a>
      </div>

      <div className='landing-model-prices-table-wrap'>
        <table className='landing-model-prices-table'>
          <thead>
            <tr>
              <th scope='col'>模型</th>
              <th scope='col'>定位</th>
              <th scope='col'>输入</th>
              <th scope='col'>输出</th>
              <th scope='col'>适合场景</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((model) => (
              <tr key={model.name}>
                <th scope='row'>
                  <span className='landing-model-prices-name'>{model.name}</span>
                  <span className='landing-model-prices-tag'>{model.tag}</span>
                </th>
                <td>{model.tag.split(' · ')[1]}</td>
                <td className='landing-model-prices-price'>{model.input}</td>
                <td className='landing-model-prices-price'>{model.output}</td>
                <td>{model.fit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className='landing-model-prices-note'>
        忙时、缓存读写、长上下文和不同分组的实际价格可能不同；注册后可查看完整价格并创建 API Key。
      </p>
    </section>
  )
}
