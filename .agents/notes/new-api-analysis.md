# new-api 项目深度分析(AIMOXT fork)

> 生成日期:2026-10-15
> 本地仓库:`/Users/hoinyan/Projects/new-api`
> 上游仓库:https://github.com/QuantumNous/new-api
> 本文件为纯文本 Markdown 总结,供 agent / MCP 文件工具后续查阅参考。
>
> 2026-10-15 补充:两轮"模型请求全链路只读技术分析 + 定向复核"已完成(均未修改
> 业务代码),核心结论合并至 §4 附录;文件内标注:
> **VERIFIED** = 已对照当前源码逐行核实(含文件:行号);**INFERRED** = 基于源码
> 推断、未实测;**UNVERIFIED** = 尚未核实,不得当作事实引用。时点信息(函数行号
> 等)随代码演进会漂移,引用前请按函数名重新定位。

---

## 1. 项目身份与 fork 关系

- **上游项目**:QuantumNous/new-api —— 统一 AI 模型聚合分发网关,将各家 LLM 互转为
  OpenAI / Claude / Gemini 兼容协议,面向个人与企业的集中式模型管理。
  基于 One API(MIT)演化,协议 AGPL-3.0(本地 LICENSE 为纯 AGPL-3.0 文本,
  未发现 QuantumNous 附加条款)。
- **本地仓库**:个人 fork `github.com/humloane/new-api`,HEAD 在 `main` 分支,
  共 6458 个 commit(已验证);上游提交数 6563 为 2026-10 检查所得,本工作区
  无 upstream remote,未验证。
- **本地基于上游某一较新快照**(本地历史包含上游 PR #7543 "highlight differing
  values in source price expressions"),此前对照显示可能**落后上游最新提交**
  (尚未重新验证)。注意:本工作区仅有
  `origin`(fork 自身)remote,无 upstream remote;以下上游状态均为 2026-10 某次
  检查所得,**本工作区未复验、标记未验证**:上游当时约 6563 个 commit、上游目录
  中已有 `tokenkit/` 模块(本地确无 `tokenkit/`,已验证),即本地缺少上游后续新增功能。
- **Go module 路径**保持为 `github.com/QuantumNous/new-api`(fork 未改 module path)。
- **本地 fork 的自有改动全部集中在 Web 前端层与部署配置**,后端零改动:
  1. Docker Compose 部署配置 + URL-safe 密码文档(4 个提交:3 个 chore + 1 个 docs)
  2. `backup/pre-aimoxt-landing-20260925` 分支为落地页重设计前的备份点
  3. **AIMOXT 品牌化落地页重设计**(PR #1,`aimoxt/landing-redesign` 分支合并):
     31 个文件,+3515 / -1159 行

### AIMOXT 定制明细(相对 `origin/backup/pre-aimoxt-landing-20260925`)

| 文件 | 说明 |
|---|---|
| `web/src/lib/site-seo.ts` | 品牌与 SEO 核心:`SITE_TITLE = 'AIMOXT|妙信AI - AI大模型API聚合平台'`;`parseSiteOrigin` 校验 `VITE_PUBLIC_SITE_URL` 必须是纯 HTTPS origin(无 credentials/path/query/hash);动态生成 `robots.txt`(Disallow `/api/` `/v1/` `/v1beta/` `/dashboard` `/keys` `/system-settings`,附 Sitemap 行)与 `sitemap.xml` |
| `web/site.config.json` | `{"publicSiteUrl": ""}`,公开站点 origin 配置 |
| `web/src/styles/landing.css` | 933 行落地页样式 |
| `web/src/features/home/` | 落地页重设计:`index.tsx`、`types.ts`(顶层);`components/` 下 `hero-buttons.tsx`、`hero-terminal-demo.tsx`(大幅重写)、`landing-illustrations.tsx`(新增 201 行)、`sections/` 下 `hero.tsx` `features.tsx` `how-it-works.tsx` `stats.tsx` `cta.tsx` 改写,新增 `developer-guide.tsx`(374 行) |
| `web/src/features/home/__tests__/landing-page.test.tsx` | 523 行落地页测试 |
| `web/src/lib/__tests__/site-seo.test.ts` | SEO 工具测试 |
| `web/src/components/layout/components/footer.tsx` `public-header.tsx` | 页脚/公共头部品牌化 |
| `web/src/main.tsx` `web/src/routes/__root.tsx` `web/src/routes/index.tsx` | SEO/品牌挂载点 |
| `web/src/i18n/locales/{en,zh,zh-TW,fr,ru,ja,vi}.json` | 7 语言文件各改:6 语言 +89 行,zh.json +91 行(7 个语言文件合计 +617/-8) |
| `web/index.html` `web/rsbuild.config.ts` | SEO 资产注入:`rsbuild.config.ts` 增加 site-seo-assets 插件(生产构建生成 robots/sitemap/JSON-LD) |
| `web/src/features/system-settings/general/system-info-section.tsx` | 落地页配套的系统信息文案调整 |

---

## 2. 技术栈总览

| 层 | 技术 |
|---|---|
| 后端语言 | Go 1.25.1(`go.mod`) |
| Web 框架 | Gin v1.9.1 + gin-contrib(cors/gzip/static) |
| ORM | GORM v2;主库支持 **SQLite(glebarez 纯 Go)/ MySQL ≥ 5.7.8 / PostgreSQL ≥ 9.6**;日志库另支持 **ClickHouse** |
| 缓存 | Redis(go-redis v8)+ 内存缓存 |
| 认证 | 浏览器 session、API token、PAT、JWT、WebAuthn/Passkey(go-webauthn)、TOTP(pquerna/otp)、OAuth/OIDC(coreos/go-oidc);**Casbin v2** 授权(`service/authz`) |
| JS 插件运行时 | Sobek(在 `pkg/jsplugin/`) |
| 前端 | React 19 + TypeScript + **Rsbuild 2** + TanStack Router/Query/Table/Virtual + Zustand 5 + Base UI + Tailwind CSS 4 + sonner;包管理 **Bun** |
| 可观测性 | Grafana Pyroscope 持续剖析(`common/pyro.go`)、`pkg/perf_metrics` 性能指标子系统、审计日志、`net/http/pprof` |
| 桌面端 | Electron 包装(`electron/`,tray 图标、macOS entitlements) |
| 构建 | makefile + Dockerfile / Dockerfile.dev / docker-compose.yml / docker-compose.dev.yml |

---

## 3. 后端目录架构

```
main.go           入口。embed web/dist(index.html 直出);`new-api plugin ...` CLI
                  子命令进入 jsplugin.RunCLI;启动时 InitResources(DB/Redis/迁移)
router/           11 个非测试 .go 文件(含 main.go):
  api-router.go   管理 API(430 行),见 §5
  relay-router.go 协议兼容 Relay API(230 行),见 §5
  channel-router.go / task-router.go / task-plugin-protocol-router.go /
  video-router.go / plugin-router.go / dashboard.go / authz-router.go /
  web-router.go   其余分组
middleware/       auth.go(用户/管理员/token 鉴权)、distributor.go(渠道分发)、
                  rate-limit / model-rate-limit / email-verification-rate-limit、
                  gzip、cors、i18n、audit、header_nav、request-id、
                  request_body_limit、secure_verification、task_plugin、
                  task_artifact_access、trusted_proxies、turnstile-check、
                  performance、stats 等约 30 个
controller/       78 个 handler 文件(不含测试):channel(测试/多key/亲和/upstream同步)、
                  token、user、redemption、option、billing、subscription、
                  topup(stripe/creem/epay/waffo/pancake)、task、task_plugin(含 debug)、
                  codex_usage、playground、rankings、pricing、model_sync、
                  custom_oauth、passkey、twofa、telegram、wechat、uptime_kuma、
                  audit、system_task、usedata、deployment 等
service/          业务层:channel_select(渠道选择/自动分组/亲和)、quota、
                  计费结算(billing_session、tiered_settle、text_quota、
                  image_billing、task_billing)、codex_oauth + codex_credential_refresh、
                  task_polling、task_artifact_store、responses_usage、
                  rankings、sensitive、system_task、subscription_reset_task、
                  authz/(Casbin)、passkey/
model/            GORM 模型与迁移:channel、token、user、redemption、log、
                  pricing/model_pricing、channel_cache、casbin_rule、passkey、
                  audit_log、quota_reserve、migration_dialector(三库方言适配)、
                  locking(lockForUpdate)
relay/            上游适配核心,见 §4
relaykit/         独立 Go 模块(AGENTS.md 约定 GOWORK=off 可单独构建,未执行验证):
  dto/            openai / claude / gemini / audio / embedding / rerank /
                  realtime / openai_video / alpha_search / billing_usage 等 DTO
  relayconvert/   请求/响应转换器注册表(request_registry / response_registry /
                  text_converter_registry / convmeta / reasoning / kitutil)
  reasonmap/      错误原因映射
  types/          共享类型
pkg/              billingexpr(计费表达式引擎:compile/settle/round/fixed/run/types.go)、
                  jsplugin(Sobek 引擎 + 注册表 + 路由)、cachex、ionet、
                  perf_metrics、wsmanager
setting/          分域配置:billing_setting、ratio_setting、performance_setting、
                  console_setting、model_setting、operation_setting、system_setting、
                  task_pricing_setting、perf_metrics_setting、reasoning、
                  支付配置(creem/stripe/waffo/waffo-pancake;epay 配置位置未核实)
types/            price_data.go(PriceData/OtherRatios)、task_artifact.go、rw_map、set
oauth/            内置 OAuth 提供者
i18n/             后端 i18n(en / zh-CN / zh-TW,yaml 文件),nicksnyder/go-i18n
common/           json.go(Marshal/Unmarshal 统一入口)、quota_math.go、limiter/
constant/         常量
dto/              请求/响应 DTO
logger/           日志封装
plugins/tasks/    10 个 JS 任务插件(见 §4.2)
docs/             openapi(api.json / relay.json)、plugin-api(v1.md / v1.schema.json /
                  v1.d.ts)、installation、authentication、channel
e2e/              仅 1 个 Go 测试文件 doc_parse_test.go
electron/         桌面端包装
```

### 后端关键约定(来自 AGENTS.md)

- JSON 一律走 `common.Marshal/Unmarshal/...`,业务代码禁止直接调 `encoding/json`
- 数据库代码必须同时兼容 SQLite / MySQL≥5.7.8 / PostgreSQL≥9.6;`FOR UPDATE`
  行锁用 `model/locking.go` 的 `lockForUpdate(tx)`
- Relay 请求 DTO 的可选标量字段必须用指针 + `omitempty`(显式零值要透传)
- 计费规则见 `.agents/rules/billing.md`(涉及 billing 的改动必须全文读)


---

## 4. Relay / 上游适配

### 4.1 渠道适配器(`relay/channel/`,35+ 家)

openai、claude(Anthropic)、gemini、vertex(GCP)、aws(Bedrock)、alibaba、tencent、
baidu / baidu_v2、zhipu / zhipu_4v、deepseek、moonshot、minimax、xai、jina、
ollama、dify、coze、cloudflare、mistral、perplexity、openrouter、replicate、
siliconflow、jimeng、ali、volcengine、xunfei、palm、lingyiwanwu、sub2api、
submodel、mokaai、ai360、codex、cohere、newapi、advancedcustom、xinference、
**task/**(异步任务渠道子包)

非测试渠道目录共 40 个(标题"35+"为概数)。注意:**kling 不是渠道**,
它是任务插件(`plugins/tasks/kling`)。

统一通过 `relay/channel/adapter.go` 接口接入;`relay/common/relay_info.go`
(RelayInfo:PriceData、TieredBillingSnapshot、计费字段)是每次转发请求的核心状态。

### 4.2 JS 任务插件(`plugins/tasks/`,Task Plugin API v1)

10 个内置任务插件(生图/生视频/音乐等异步任务):alibaba、google、jimeng、sora、
vertex-ai、doubao、hailuo、kling、sunoapi、vidu。
由 `pkg/jsplugin/`(Sobek 引擎)执行,契约文档 `docs/plugin-api/v1.md`
(+ v1.schema.json / v1.d.ts)。渠道可绑定任务插件
(绑定逻辑在 `controller/channel.go` 的 TaskPluginBindings / `authz.TaskPluginBind`)。

### 4.3 计费引擎(`pkg/billingexpr/`)

表达式化计费:compile.go 编译、settle.go 结算、round.go 取整、fixed.go 固定价、
run.go 执行、types.go 类型。配合 `setting/billing_setting/`、`types/price_data.go`、
`relay/helper/price.go`、`service/quota.go` 等形成 预扣费 → 流式/任务结算 →
退款 链路。规则总纲 `.agents/rules/billing.md`。

### 4.4 附录:模型请求全链路调用链(2026-10-15 两轮只读分析 + 复核)

以 `POST /v1/chat/completions` 为例。行号均为 2026-10-15 核实值,会漂移,
引用前按函数名重新定位。

**A. 调用链总览**

1. **路由注册**:`router/main.go SetRouter` → `router/relay-router.go
   SetRelayRouter`;`/v1` 组(别名 `/pg`、`/:mode`)中间件链
   `RouteTag("relay")` → `SystemPerformanceCheck` → `TokenAuth` →
   `ModelRequestRateLimit` → `Distribute`,
   `POST /chat/completions` 闭包 → `controller.Relay(c, RelayFormatOpenAI)`
   (`relay-router.go:32-41,105-107`)。
2. **TokenAuth**(`middleware/auth.go:361`):WS 子协议 / `x-api-key` / `?key=` /
   `x-goog-api-key` 归一为 Authorization;去 `sk-` 前缀;
   `model.ValidateUserToken` —— **VERIFIED:DB 错误返回 500、其他鉴权错误
   返回 401**(`auth.go:412-421`);令牌 IP 白名单;用户缓存状态;分组校验;
   `SetupContextForToken`(`auth.go:506`)。
3. **Distribute 渠道选择**(`middleware/distributor.go:34-131`):给
   `GetChannelConstraints` 加 `FilterRequestPath`(+任务插件 identity filter);
   `getModelRequest`(359,默认 `shouldSelectChannel=true`,chat 从 body 取
   model)→ `service.SelectChannelForRequest`
   (`service/channel_select.go:283`)→ `SetupContextForSelectedChannel`
   (`distributor.go:548`,写入 `ContextKeyChannelId/Name/Type/Setting/Key/
   BaseUrl/ModelMapping/StatusCodeMapping/MultiKey*` 等全量渠道 context)
   → `c.Next()` 后 `RecordChannelAffinity`。
4. **控制器**(`controller/relay.go` `Relay` 51):`GetAndValidateRequest` →
   `GenRelayInfo`(**不设置 ChannelMeta**,`relay/common/relay_info.go:562-728`)
   → **预扣费 `PrepareRequestBilling`(:141,在重试循环之外,只执行一次)** →
   `defer RefundFailedRequestBilling`(:144,循环结束后执行)→ 重试循环
   (:158,`common.RetryTimes`):
   - `getChannel`(:262):**retry=0 走 `ChannelMeta==nil` 分支,直接使用
     Distribute 写入 context 的渠道**(不重新选择);**retry≥1 走
     `CacheGetRandomSatisfiedChannel` 重新选择**,并执行 `HandleGroupRatio`
     (:286,刷新 `PriceData.GroupRatioInfo`)、
     `PrepareTieredBillingForSelectedGroup`(:170)、
     `SetupContextForSelectedChannel`(:289,全量重写渠道 context)。
   - 按 relayFormat 分派(:187-196):`WssHelper` / `ClaudeHelper` /
     `geminiRelayHandler` / `TextHelper`。
   - `TextHelper`(`relay/compatible_handler.go:25`):第一行
     **`InitChannelMeta`(`relay_info.go:245-325`,per-attempt 从 context 物化
     ChannelMeta、查 `streamSupportedChannels`、清 `convOptions`)** →
     模型映射 → `GetAdaptor`(`relay/relay_adaptor.go:50`)→ 协议转换/透传
     body → `adaptor.DoRequest`(上游请求)→ 非 200 `RelayErrorHandler` +
     `ResetStatusCode` → `adaptor.DoResponse`(流式:`OaiStreamHandler`,
     `relay/channel/openai/relay-openai.go:103`)→ `service.PostTextConsumeQuota`
     (结算)。
   - 失败:`DecideRelayRetry`(retry/stop)→ `processChannelError`(自动 BAN)
     → `AppendUsedChannel`(仅日志轨迹)。成功:`MarkRequestPolicySuccess`。

**B. 渠道选择与重试机制(定向复核确认)**

- 选择数据源为 ability 内存缓存(启动 `InitChannelCache`、周期
  `SyncChannelCache`,`model/channel_cache.go`)。
- `GetRandomSatisfiedChannel`(`model/channel_cache.go:117`):模型名精确匹配
  → 归一化名回退;优先级层降序排列,**重试计数即优先级层索引**(越界钳位到
  最低层);层内按权重随机(平均权重<10 时 100 倍平滑)。
- **VERIFIED:不存在请求级"失败渠道 ID 排除"机制**。`ChannelFilter` 枚举仅
  `request_path` / `task_plugin_identity` / `responses_websocket`
  (`dto/channel_constraints.go:36-50`);`AppendUsedChannel`
  (`service/channel_select.go:388-392`)只写 `use_channel` 轨迹(重试日志与
  consume log 读取),**不能据此认为选择器排除已失败渠道**;同一优先级层内
  可能再次抽中同一渠道。
- 三条**相互独立**的机制,不得混为一谈:
  1. **自动 BAN**:`service.ProcessChannelError`(`service/relay_error.go:64`)
     → `ShouldDisableChannel && AutoBan` → 异步 `DisableChannel` →
     `CacheUpdateChannelStatus` 改缓存并从候选集移除(后续重试选不到)。
  2. **多 Key 轮转**:`Channel.GetNextEnabledKey`(`model/channel.go:206`,
     Random 重新抽取 / Polling 轮询),每次 `SetupContextForSelectedChannel`
     重新执行——同一渠道重试也可能换 key。
  3. **优先级层下降**:重试索引使选择落到更低优先级层(层数不够时钳位)。
- 三条选择路径:
  - **管理员 Pin**:`sk-xxx-<channelId>` 在 `SetupContextForToken` 添加
    `ChannelPin{PinSourceToken, PinRetrySingleAttempt}`(普通用户 403);
    `SelectChannelForRequest` 内 `ResolvedPin` 直接命中返回;
    `SuppressesRetry()`(`dto/channel_constraints.go:114`)使
    `DecideRelayRetry` 返回 stop("pinned_channel"),**不重试**。
  - **任务插件**:identity filter 过滤 + 选中后
    `channelMatchesExpectedTaskPlugin` 校验 + pinned endpoint 重绑
    (`distributor.go:550-587`)。**UNVERIFIED**:`expected_task_plugin_key`
    的完整上游设置链路未定位。
  - **普通请求**:亲和性偏好(`channel_select.go:309-347`,strict 会话模式无
    可用亲和渠道直接 503)→ 无亲和渠道时 `CacheGetRandomSatisfiedChannel`
    → `ChannelSatisfiesFilters` 总闸。
- **重试后一致性**:context 是渠道信息的单一事实源;ChannelMeta 每次尝试
  由 `InitChannelMeta` 全量重建;定价中 `GroupRatioInfo` 每次尝试由
  `HandleGroupRatio` 更新(基础价格保持请求级);分层计费快照仅在
  `GroupRatio` 变化时刷新(`refreshTieredBillingGroup`,
  `service/tiered_settle.go:139-161`,重算 `EstimatedQuotaAfterGroup`)。

**C. 计费与结算(已核实不变量,规则总纲 `.agents/rules/billing.md`)**

- **预扣费在重试循环之前、只执行一次**;重试间保留同一 `BillingSession`
  与定价快照(`relay/request_billing.go:21-23` 注释 + 代码结构)。
- `PrepareRequestBilling`(`relay/request_billing.go:24`):敏感词(可选)→
  `EstimateRequestToken` → `helper.ModelPriceHelper`(PriceData /
  QuotaToPreConsume)→ `FreeModel` 跳过预扣 →
  `service.PreConsumeBilling`(`service/billing.go:20`)。
- `NewBillingSession`(`service/billing_session.go:379`)按计费偏好四分支:
  `subscription_only` / `wallet_only` / `wallet_first` /
  `subscription_first`(默认);订阅 `subConsume` 下限 1(防订阅多扣费);
  钱包先查余额;订阅不足时仅当
  `UserActiveSubscriptionsAllowWalletOverflow` 允许才回退钱包。
- 预扣两步:**先资金来源、后令牌额度**(`PreConsumeTokenQuota`
  `service/quota.go:393`,原子 `model.TryReserveTokenQuota`);令牌预扣失败
  回滚资金来源;`trusted` 旁路时 `preConsumedQuota=0`。
- **结算**:`PostTextConsumeQuota`(`service/text_quota.go:393`)→ 倍率/价格
  汇总(分层表达式 `TryTieredSettle` 优先)→ `SettleBilling`
  (`service/billing.go:51`):有 session 走 `session.Settle(actualQuota)`
  —— `delta = actual - preConsumed`;`delta==0` 幂等;资金来源先提交并置
  `fundingSettled`(其后令牌调整失败仅记日志,防 Refund 误退资金);无
  session(按次计费等)回退 `PostConsumeQuota`(`service/quota.go:420`)。
- **退款**:`defer RefundFailedRequestBilling`(重试循环结束后执行)→
  `session.Refund` **幂等**(`settled || refunded` 立即返回,
  `billing_session.go:86-93`)+ 异步 gopool 退还;已结算会话**不会退款**
  (VERIFIED)。另 `ChargeViolationFeeIfNeeded` 违规扣费。
- **UNVERIFIED(不得当作已验证事实引用)**:流式断流时
  `OaiStreamHandler` 内部对部分 usage 的处理与是否存在部分结算未通读。
  已确认部分:`DoResponse` 出错时 `TextHelper` 直接返回错误、**不调用**
  `PostTextConsumeQuota`,预扣费由循环结束后的退款路径全额退还
  (`compatible_handler.go:171-176` + `request_billing.go:71-81`)。

**D. 未验证事项清单(截至 2026-10-15)**

- 流式断流时 `OaiStreamHandler` 的部分 usage 处理与结算行为(UNVERIFIED)
- `expected_task_plugin_key` 的完整上游设置链路(UNVERIFIED)
- `DecideRelayRetry` 的完整可重试条件表:已见 `retry_status_matched` /
  `strict_session` / `pinned_channel` 分支(`service/relay_error.go:21-58`),
  其余状态码/错误码集合为 INFERRED
- 渠道亲和性缓存键的构造规则(`getChannelAffinityContext`,UNVERIFIED;
  读写端点已确认:`service/channel_affinity.go:727`、
  `channel_select.go:309-347`)
- 内存缓存关闭时 `GetChannel` 回源 DB 的具体过滤逻辑
  (`model/ability.go`,UNVERIFIED)
- 以上结论均基于静态源码阅读,未在真实请求下动态验证

---

## 5. API 接口面

### 5.1 Relay 协议兼容 API(`router/relay-router.go`)

| 协议 | 端点 |
|---|---|
| OpenAI | `POST /v1/chat/completions`、`/v1/completions`、`/v1/embeddings`、`/v1/images/*`、`/v1/audio/transcriptions|translations|speech`、`/v1/rerank`、`/v1/moderations`、`/v1/models/*`、`GET /v1/responses`(ResponsesWebSocket)、`POST /v1/responses/compact`、`/v1/alpha/search` |
| OpenAI Realtime | `GET /v1/realtime`(WebSocket) |
| Claude | `POST /v1/messages`、`/v1/messages/count_tokens`(注释态) |
| Gemini | `POST /v1beta/models/*path`(catch-all;`:countTokens` 显式返回 404);`GET /v1beta/models`、`GET /v1beta/openai/models` 模型列表 |
| Playground | `POST /pg/chat/completions` |
| Midjourney | `/mj/image/:id`、`/mj/submit/{action,shorten,modal,imagine}` |
| 未实现占位 | `/v1/files/*`、`/v1/fine-tunes/*` 等 → `RelayNotImplemented` |

中间件链(注册顺序):SystemPerformanceCheck → TokenAuth → ModelRequestRateLimit →
Distribute(渠道选择,ws/http 子组);计费不是中间件层,由 Relay 控制器内完成
(RelayInfo 预扣费/结算)。

### 5.2 管理 API(`router/api-router.go`,前缀 `/api`)

分组(带全局 gzip / AccessTokenAudit / BodyStorageCleanup / GlobalAPIRateLimit):

- 公开:`/setup`、`/status`、`/uptime/status`、`/notice`、`/user-agreement`、
  `/privacy-policy`、`/about`、`/home_page_content`、`/pricing`、`/rankings`、
  `/ratio_config`、`/perf-metrics/*`
- 认证/安全:`/verification`(邮箱验证)、`/reset_password`、`/user/reset`、
  `/verify/methods`、`/verify`(敏感操作安全验证)、Turnstile 人机校验
- OAuth:`/oauth/state`、`/oauth/email/bind/*`、`/oauth/wechat*`、`/oauth/telegram/*`、
  `/oauth/:provider`(自定义 OIDC,`/api/custom-oauth-provider` 管理)
- 支付 webhook:`/stripe/webhook`、`/creem/webhook`、`/waffo/webhook`、
  `/waffo-pancake/webhook/:env`、`/subscription/epay/{notify,return}`
- 分组路由:`/user/*`、`/subscription/*` + `/subscription/admin/*`、`/option/*`、
  `/performance/*`、`/ratio_sync/*`、`/plugin/task/*`(任务插件管理)、
  `/token/*`、`/usage/*`、`/redemption/*`、`/audit` + `/audit/self`、`/log/*`、
  `/system-task/*`;渠道分组见 `channel-router.go`、任务分组见 `task-router.go`
- 权限:Casbin `middleware.RequirePermission(authz.Xxx)` 细粒度授权

### 5.3 OpenAPI 文档

`docs/openapi/api.json`(管理 API)与 `docs/openapi/relay.json`(Relay API)。


---

## 6. 安全与认证体系

- 登录:邮箱+密码、`oauth/` 包内置提供者(github/telegram/discord/linuxdo/通用
  OIDC)、WeChat 与 Telegram 另有独立登录控制器(`/oauth/wechat`、`/oauth/telegram/*`)、
  自定义 OIDC
- MFA/凭证:WebAuthn/Passkey(`service/passkey/`)、TOTP(`controller/twofa.go`)
- 敏感操作:安全验证流程(`middleware/secure_verification.go`;login_verification
  流程的具体实现未核实)
- 授权:Casbin 角色/权限(`service/authz/`、`model/authz_role.go`、`casbin_rule.go`)
- 限流:全局 API 限流、模型级限流、关键操作(Critical)限流、邮箱验证限流、
  用户级关键限流
- 审计:审计日志(`model/audit_log.go`、`controller/audit.go`)
- OWASP:AGENTS.md 强制认证相关改动遵循 ASVS + Cheat Sheet 系列

---

## 7. 前端架构(`web/`)

- **路由**:TanStack Router file-based(`web/src/routes/`),生成 `routeTree.gen.ts`;
  `(auth)` `(errors)` `_authenticated` 目录约定
- **业务域**(`web/src/features/`,28 个):about、auth、channels、chat、dashboard、
  errors、home(AIMOXT 落地页)、keys、legal、model-pricing、models、
  performance-metrics、playground、pricing、profile、rankings、
  redemption-codes、security、setup、subscriptions、system-info、
  system-settings、system-update、task-plugins、usage-logs、users、wallet
- **状态**:Zustand 4 个 store —— auth-store、notification-store、
  pricing-preferences-store、system-config-store
- **数据**:@tanstack/react-query(`lib/query-client.ts`、`lib/api.ts`、
  `lib/http-client.ts`)
- **UI**:shadcn 风格组件(`web/src/components/`,Base UI + Tailwind 4)+ 项目
  shadcn-ui skill;必须优先复用现有组件(AGENTS.md 强制)
- **i18n**:i18next + react-i18next + browser-languagedetector;7 语言
  en / zh / zh-TW / fr / ru / ja / vi;平铺 JSON,key 为英文源字符串;
  `bun run i18n:sync` 同步
- **数字/货币格式化**:`@/lib/format`、`@/lib/currency`;界面语言码必须经
  `toIntlLocale`(`@/i18n/languages`)转换后才能进 Intl API
- **构建**:Rsbuild(`bun run dev|build|typecheck|lint|test`);产物被后端
  `go:embed web/dist` 内嵌

---

## 8. 部署与运行

- **本地开发**:`cd web && bun install && bun run build`,然后 `go run .`;
  前端 dev server `bun run dev -- --port 5173`(代理到 :3000);
  容器化开发 `docker-compose.dev.yml` / `make dev`
- **makefile 目标**:all(=build-all-web+start-api)、build-web、build-all-web、
  start-api、dev-api、dev-api-rebuild、dev-web、dev、test、reset-setup
- **Docker Compose**(`docker-compose.yml`):应用镜像 `my-new-api:local` +
  redis:7-alpine + postgres:15(默认);mysql:8.2 与 clickhouse 24.8 为注释可选;
  fork 层补充了 URL-safe 密码部署文档
- **Electron 桌面端**:`electron/`(main.js/preload.js/tray 图标/entitlements)
- **插件 CLI**:`new-api plugin ...` 子命令
- **relaykit 独立构建校验**:`cd relaykit && GOWORK=off go build ./...`(AGENTS.md
  约定,第二轮核查未实际执行)

---

## 9. 与上游 GitHub(QuantumNous/new-api)对照结论

1. 本地 fork = 上游较新快照 + 部署配置 + AIMOXT 前端品牌化;**后端无任何 fork 层改动**
2. 此前对照(时点:2026-10-15)显示本地**可能落后上游**,当前尚未重新验证
   (上游 6563 vs 本地 6458 commits 基于当时检查,本工作区无 upstream remote,
   **未验证**;本地确无 `tokenkit/` 模块,已验证);若确认落后,同步需
   rebase/merge 上游 main 并处理前端定制冲突
3. 上游定位(按本地 README):基于 One API(MIT)开发的开源项目;关联项目
   One API(上游基座)、Midjourney-Proxy、new-api-key-tool、new-api-horizon;
   官方文档 docs.newapi.ai;本地 LICENSE 为纯 AGPL-3.0 文本(未含 QuantumNous
   附加条款)
4. 受保护标识(AGENTS.md):`new-api` 项目名与 `QuantumNous` 作者归属**禁止修改、
   删除、替换**;AIMOXT 品牌化仅在 landing/SEO 层叠加,未触碰受保护字段

---

## 10. 常用命令速查

```bash
# 前端(web/)
bun install
bun run dev            # Rsbuild dev server
bun run build          # 生产构建 → web/dist
bun run typecheck      # tsgo -b(TypeScript 原生编译器预览)
bun run lint           # oxlint
bun run test           # vitest run
bun run i18n:sync      # i18n 文案同步

# 后端(仓库根)
go run .               # 运行(需先 build web)
go run . plugin ...    # JS 插件 CLI
make test              # Go 测试
cd relaykit && GOWORK=off go build ./...   # relaykit 独立构建(AGENTS.md 约定,未执行验证)

# 部署
docker compose up -d   # app + redis + postgres
```

---

## 附:关键文件索引

| 主题 | 文件 |
|---|---|
| 入口 | `main.go` |
| 管理路由 | `router/api-router.go` |
| Relay 路由 | `router/relay-router.go` |
| 渠道适配接口 | `relay/channel/adapter.go` |
| 转发核心状态 | `relay/common/relay_info.go` |
| 协议转换 | `relaykit/relayconvert/`、`relaykit/dto/` |
| 计费表达式 | `pkg/billingexpr/` |
| 计费规则总纲 | `.agents/rules/billing.md` |
| 任务插件契约 | `docs/plugin-api/v1.md` |
| JS 插件运行时 | `pkg/jsplugin/engine.go` |
| 数据库迁移/方言 | `model/main.go`、`model/migration_dialector.go`、`model/locking.go` |
| 前端约定 | `web/AGENTS.md` |
| AIMOXT 品牌/SEO | `web/src/lib/site-seo.ts`、`web/site.config.json`、`web/src/features/home/` |
| OpenAPI | `docs/openapi/api.json`、`docs/openapi/relay.json` |
