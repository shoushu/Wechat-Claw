# YutoAI 微信节点

`wechat-claw` 是一个面向 `OpenClaw` 的微信通道插件，通过代理层的 Proxy API 接入微信账号，提供消息接收、规则处理、回复分发和 Webhook 回调能力。

项目目标很明确：把微信账号稳定接入 `OpenClaw`，并且把“群聊门控、规则路由、回复策略、基础风控”这些高频能力做成可配置的通道层，而不是散落在业务代码里的临时判断。

## 特性

- 支持微信私聊、群聊消息接入
- 支持文本、图片、视频、文件、语音消息入站解析
- 支持群聊 `@` 提及门控、命令前缀、群/用户白名单与黑名单
- 支持规则驱动的路由覆写：关键词、命令、正则、群、用户、多账号
- 支持 `default`、`sender`、`group`、`group-member` 四种会话粒度
- 支持群回群、群转私聊、静默入链路三种回复模式
- 支持去重、限流、敏感词拦截等基础风控
- 支持二维码登录、登录状态探测、Webhook 自动注册
- 支持 `OpenClaw` reply dispatcher，沿用分段、延迟和 typing 能力
- 内建运维命令：`/ping`、`/status`、`/help`

## 适用范围

这个仓库定位为独立开源的微信通道插件，只负责微信侧接入与 `OpenClaw` 通道集成。

以下能力不在当前仓库范围内：

- Penum 侧业务同步
- 工单系统对接
- 私有业务数据库或内部审计平台接入

如果你需要这些能力，建议在上层业务仓库中基于本插件继续扩展。

## 兼容标识

为了兼容现有运行时，项目保留以下技术标识：

- 通道 id: `wechat`
- 包名: `wechat-claw`
- 运行时入口: `openclaw`

这些属于技术兼容层，不影响对外品牌命名。

## 环境要求

- Node.js `>= 20`
- `OpenClaw >= 2026.2.9`
- 可用的微信 Proxy API 服务
- 能被代理服务访问到的 Webhook 地址

## 安装

```bash
openclaw plugins install wechat-claw
```

## 升级

```bash
openclaw plugins update wechat
```

## 最小配置

```bash
openclaw config set channels.wechat.apiKey "your-api-key"
openclaw config set channels.wechat.proxyUrl "http://your-proxy-service:13800"
openclaw config set channels.wechat.webhookHost "your-public-host"
openclaw config set channels.wechat.enabled true
```

## 单账号配置示例

```yaml
channels:
  wechat:
    enabled: true
    apiKey: "your-api-key"
    proxyUrl: "http://127.0.0.1:13800"
    webhookHost: "1.2.3.4"
    webhookPort: 18790
    webhookPath: "/webhook/wechat"
    deviceType: "mac"
    proxy: "2"
    inbound:
      allowDirect: true
      allowGroup: true
      requireMentionInGroup: true
      commandPrefixes: ["/", "#"]
      allowedMessageTypes: ["text", "image", "file", "voice", "video"]
      allowGroups: ["vip_room@chatroom"]
      blockSenders: ["wxid_spam"]
    routing:
      defaultSessionMode: "group-member"
      rules:
        - name: "sales-handoff"
          chatType: "group"
          matchType: "keyword"
          pattern: "发包"
          routeKey: "sales-room"
          agentId: "agent-sales"
          sessionMode: "group-member"
          replyMode: "direct"
        - name: "manual-service"
          chatType: "direct"
          matchType: "command"
          pattern: "human"
          autoReplyText: "已为 {{sender}} 转人工，请稍候。"
          skipAgent: true
          auditTag: "manual-service"
    reply:
      defaultGroupReplyMode: "group"
      mentionSenderInGroup: true
      mentionTemplate: "@{name} "
    riskControl:
      dedupWindowMs: 1800000
      dedupMaxSize: 1000
      senderRateLimitPerMinute: 6
      groupRateLimitPerMinute: 30
      sensitiveWords: ["退款", "投诉", "人工"]
      sensitiveReplyText: "该类诉求已进入人工处理通道。"
      rateLimitReplyText: "消息较多，请稍后再试。"
    operations:
      enableBuiltinCommands: true
```

## 多账号配置示例

```yaml
channels:
  wechat:
    accounts:
      sales:
        enabled: true
        apiKey: "sales-key"
        proxyUrl: "http://127.0.0.1:13800"
        webhookHost: "1.2.3.4"
        webhookPort: 18791
      support:
        enabled: true
        apiKey: "support-key"
        proxyUrl: "http://127.0.0.1:13800"
        webhookHost: "1.2.3.4"
        webhookPort: 18792
```

## 首次登录

```bash
openclaw gateway start
```

首次启动会输出二维码或扫码链接。完成扫码后，节点会自动轮询登录状态并向代理服务注册回调地址。

## 配置说明

### `inbound`

- `allowDirect`: 是否允许私聊进入
- `allowGroup`: 是否允许群聊进入
- `requireMentionInGroup`: 群聊是否要求 `@`
- `requireCommandPrefixInGroup`: 群聊是否要求命令前缀
- `commandPrefixes`: 命令前缀列表
- `allowedMessageTypes`: 放行的消息类型
- `allowSenders` / `blockSenders`: 用户白名单 / 黑名单
- `allowGroups` / `blockGroups`: 群白名单 / 黑名单

### `routing`

- `defaultAgentId`: 默认 agent 覆写
- `defaultSessionMode`: 默认 session 颗粒度
- `rules[]`: 规则列表，支持按聊天类型、群、用户、消息类型、关键词、命令、正则匹配
- `routeKey`: 自定义路由键，适合把不同群或关键词导向不同业务智能体
- `replyMode`: `group`、`direct`、`silent`

### `reply`

- `defaultGroupReplyMode`: 群默认回复模式
- `mentionSenderInGroup`: 群回复时是否自动 `@` 发送人
- `mentionTemplate`: 群回复前缀模板，支持 `{name}` 和 `{id}`

### `riskControl`

- `dedupWindowMs`: 去重窗口
- `dedupMaxSize`: 去重缓存上限
- `senderRateLimitPerMinute`: 单用户每分钟限流
- `groupRateLimitPerMinute`: 单群每分钟限流
- `sensitiveWords`: 敏感词列表
- `sensitiveReplyText`: 命中敏感词后的提示文案
- `rateLimitReplyText`: 命中限流后的提示文案

### `operations`

- `enableBuiltinCommands`: 是否启用 `/ping`、`/status`、`/help`

## 常见用法

- 群里只有被 `@` 才回复：`inbound.requireMentionInGroup: true`
- 某些群走不同智能体：在 `routing.rules[]` 中设置 `groupIds + agentId + routeKey`
- 群里触发后改私聊继续：把规则的 `replyMode` 设为 `direct`
- 命中关键词后直接回复，不进入智能体：设置 `autoReplyText` 并把 `skipAgent` 设为 `true`
- 风险话术直接拦截：配置 `riskControl.sensitiveWords` 和 `sensitiveReplyText`

## 开发与验证

安装依赖：

```bash
npm ci
```

类型检查：

```bash
npm run typecheck
```

运行全部验证：

```bash
npm run verify
```

如果本机没有 Node 环境，也可以使用 Docker：

```bash
docker run --rm -v "$(pwd):/app" -w /app node:22-bullseye \
  bash -lc 'npm ci --ignore-scripts && npm run verify'
```

## 测试说明

- `test-channel.ts`: 通道配置、目录查询、状态接口和目标解析
- `test-plugin.ts`: Webhook 接收与鉴权验证
- `test-business.ts`: 业务规则链路，包括群 `@` 门控、路由覆写、私聊回落、敏感词拦截和媒体消息入链路

这些测试不依赖真实微信账号，适合作为本地开发和 CI smoke test。

## 已知限制

- 当前稳定的出站能力是文本和图片；其他媒体类型会回退成文本链接，避免因为代理侧实现差异导致发送失败
- 登录态目前依赖代理服务返回和运行时配置，不包含独立持久化存储
- 规则中的 `auditTag` 当前只写入上下文，不负责外部审计系统落库

## 贡献

欢迎提交 Issue 和 Pull Request。提交前建议先运行：

```bash
npm run verify
```

更多说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

MIT
