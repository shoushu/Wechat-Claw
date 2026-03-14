# OpenClaw WeChat

`Wechat-Claw` 是 `OpenClaw` 的微信通道插件，通过 Proxy API 接入微信账号。

仓库只包含通道适配层代码、公开部署文档和示例配置，不包含私有业务系统、工单流转、内部数据库或内部审计逻辑。

## 功能

- 微信私聊、群聊消息接入
- 文本、图片、视频、文件、语音消息解析
- 群聊 `@` 提及门控、命令前缀、群/用户白名单与黑名单
- 规则驱动的路由覆写：关键词、命令、正则、群、用户、多账号
- `default`、`sender`、`group`、`group-member` 四种会话粒度
- 群回群、群转私聊、静默入链路三种回复模式
- 去重、限流、敏感词拦截等基础风控
- 二维码登录、登录状态探测、Webhook 自动注册
- `OpenClaw` reply dispatcher 集成
- 内建运维命令：`/ping`、`/status`、`/help`

## 范围外内容

以下内容不在本仓库范围内：

- 私有业务系统同步
- 工单系统创建与流转
- 内部标签平台、审计平台、数据库写入
- 自定义模型服务封装

这类能力应放在上层业务仓库中实现，不应回写到通道层。

## 仓库内容

- `WeChatPadPro` 部署详解：[`docs/wechatpadpro-self-hosting.md`](docs/wechatpadpro-self-hosting.md)
- `WeChatPadPro` 脱敏 compose：[`examples/wechatpadpro/docker-compose.yml`](examples/wechatpadpro/docker-compose.yml)
- `WeChatPadPro` 脱敏环境变量：[`examples/wechatpadpro/.env.example`](examples/wechatpadpro/.env.example)
- `OpenClaw` 对接示例：[`examples/openclaw/openclaw.wechatpadpro.yaml`](examples/openclaw/openclaw.wechatpadpro.yaml)
- Nginx 回调示例：[`examples/nginx/wechat-webhook.conf`](examples/nginx/wechat-webhook.conf)

本仓库不分发 `WeChatPadPro` 源码，只提供部署模板和对接示例。

## 兼容标识

为了兼容 `OpenClaw` 当前的插件发现和自动启用逻辑，仓库保留以下标识：

- 仓库名：`Wechat-Claw`
- npm 包名：`@hkyutong/wechat`
- 插件 id：`wechat`
- 通道 id：`wechat`

这些标识分别用于源码仓库、包元数据和运行时加载，不应随意改动。

## 环境要求

- Node.js `>= 22`
- `OpenClaw >= 2026.2.9`
- 可用的微信代理服务
- 可被代理服务访问的 Webhook 地址

## 组件关系

- `OpenClaw`：宿主网关，负责加载插件、维护会话和调用模型
- `OpenClaw WeChat`：本仓库，负责微信通道接入
- `Proxy API`：负责微信登录、收消息、发消息

README 中的 `apiKey` 指微信代理服务的鉴权凭证，不是模型厂商的 API Key。

## 安装

### 1. 安装 OpenClaw

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### 2. 拉取插件并从本地路径安装

`OpenClaw` 当前支持 npm registry 包、归档文件和本地路径安装，不支持直接使用 GitHub URL 安装插件。

```bash
git clone git@github.com:hkyutong/Wechat-Claw.git
cd Wechat-Claw
openclaw plugins install "$(pwd)"
cd ..
```

### 3. 写入最小配置

```bash
openclaw config set channels.wechat.enabled true
openclaw config set channels.wechat.provider "wechatpadpro"
openclaw config set channels.wechat.apiKey "your-proxy-api-key"
openclaw config set channels.wechat.proxyUrl "http://your-proxy-service:1238"
openclaw config set channels.wechat.deviceType "ipad"
openclaw config set channels.wechat.webhookHost "https://your-domain.example.com"
openclaw config set channels.wechat.webhookPort 18792
```

字段说明：

- `apiKey`：微信代理服务鉴权 Key
- `proxyUrl`：微信代理服务地址
- `deviceType`：当前常用值为 `ipad`
- `webhookHost`：代理服务可回调到的公网地址
- `webhookPort`：本地回调服务监听端口

### 4. 启动网关

```bash
openclaw gateway start --verbose
```

首次启动时，日志会输出终端二维码和扫码链接。扫码完成后，可在微信中发送 `/status` 做最小验收。

## Docker 部署

如果 `OpenClaw` 运行在 Docker 中，先把仓库拉到宿主机，再把源码目录挂载进 `openclaw-cli` 容器：

```bash
git clone git@github.com:hkyutong/Wechat-Claw.git
docker compose run --rm -v "$PWD/Wechat-Claw:/plugin:ro" openclaw-cli plugins install /plugin
docker compose run --rm openclaw-cli config set channels.wechat.enabled true
docker compose run --rm openclaw-cli config set channels.wechat.provider "wechatpadpro"
docker compose run --rm openclaw-cli config set channels.wechat.apiKey "your-proxy-api-key"
docker compose run --rm openclaw-cli config set channels.wechat.proxyUrl "http://your-proxy-service:1238"
docker compose run --rm openclaw-cli config set channels.wechat.deviceType "ipad"
docker compose run --rm openclaw-cli config set channels.wechat.webhookHost "https://your-domain.example.com"
docker compose run --rm openclaw-cli config set channels.wechat.webhookPort 18792
docker compose restart openclaw-gateway
```

扫码时直接查看网关日志：

```bash
docker compose logs -f openclaw-gateway
```

## 完整自托管资料

如果需要从架构、网络方向、Nginx 回调一直看到扫码验收，直接看：

- 部署详解：[`docs/wechatpadpro-self-hosting.md`](docs/wechatpadpro-self-hosting.md)
- `WeChatPadPro` compose：[`examples/wechatpadpro/docker-compose.yml`](examples/wechatpadpro/docker-compose.yml)
- `WeChatPadPro` 环境变量示例：[`examples/wechatpadpro/.env.example`](examples/wechatpadpro/.env.example)
- `OpenClaw` 配置示例：[`examples/openclaw/openclaw.wechatpadpro.yaml`](examples/openclaw/openclaw.wechatpadpro.yaml)
- Nginx 回调示例：[`examples/nginx/wechat-webhook.conf`](examples/nginx/wechat-webhook.conf)

## WeChatPadPro 对接说明

使用 `WeChatPadPro` 时，通常需要注意以下配置：

- `proxyUrl` 一般形如 `http://host-or-service-name:1238`
- `apiKey` 填可调用代理业务接口的 key；部分版本可直接使用 `ADMIN_KEY`
- 插件优先使用 `QrLink`，并将二维码打印到终端
- `webhookHost` 必须是代理服务可反向访问的地址

以下情况更容易触发风控或导致掉线：

- 短时间内重复扫码、重复登录、重复登出
- 频繁切换代理线路或出口 IP
- 同一微信号同时接入多套 Pad/PC 协议链路
- 服务频繁离线后再拉起

这类风险主要来自代理线路、账号环境和登录行为，通道插件只能降低波动，不能消除风险。

## 稳定性参数

开源版默认启用了以下控制：

- 登录状态机和二维码节流
- 启动失败指数退避与熔断
- 出站限速、失败重试和登录态持久化

常用参数位于 `channels.wechat.operations`：

```yaml
channels:
  wechat:
    operations:
      qrThrottleMs: 90000
      qrDisplayThrottleMs: 30000
      loginPollIntervalMs: 5000
      loginTimeoutMs: 300000
      startupBaseBackoffMs: 15000
      startupMaxBackoffMs: 600000
      startupCircuitBreakerThreshold: 4
      startupCircuitOpenMs: 900000
      outboundMinIntervalMs: 1500
      outboundRetryCount: 3
      outboundRetryDelayMs: 2000
      outboundMaxRetryDelayMs: 20000
      outboundCircuitBreakerThreshold: 5
      outboundCircuitOpenMs: 300000
      statusProbeIntervalMs: 60000
      statusProbeFailureThreshold: 3
      stateFile: "~/.openclaw/wechat-state.json"
```

调参时可按下面的方向处理：

- 二维码过快失效：先检查代理出口，再考虑调大 `loginTimeoutMs`
- 担心频繁重登：不要调小 `qrThrottleMs` 和 `startupBaseBackoffMs`
- 代理服务偶发抖动：保留默认 `startupCircuit*` 和 `outboundCircuit*`
- 容器重启后需要保留状态：把 `stateFile` 放到持久卷

## 升级

```bash
git -C /path/to/Wechat-Claw pull --ff-only
openclaw plugins uninstall wechat --force
rm -rf ~/.openclaw/extensions/wechat
openclaw plugins install /path/to/Wechat-Claw
```

如果运行在 Docker 中，把上面的 `openclaw` 命令替换为 `docker compose run --rm openclaw-cli ...`，然后重启 `openclaw-gateway`。

`openclaw plugins update wechat` 仅适用于 npm 安装方式，不适用于当前的路径安装。

## 最小配置示例

```yaml
channels:
  wechat:
    enabled: true
    provider: "wechatpadpro"
    apiKey: "your-proxy-api-key"
    proxyUrl: "http://127.0.0.1:1238"
    webhookHost: "https://claw.example.com"
    webhookPort: 18792
    webhookPath: "/webhook/wechat"
    deviceType: "ipad"
```

## 单账号配置示例

```yaml
channels:
  wechat:
    enabled: true
    provider: "wechatpadpro"
    apiKey: "your-proxy-api-key"
    proxyUrl: "http://127.0.0.1:1238"
    webhookHost: "https://claw.example.com"
    webhookPort: 18792
    webhookPath: "/webhook/wechat"
    deviceType: "ipad"
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
          autoReplyText: "已转人工，请稍候。"
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
      qrThrottleMs: 90000
      startupBaseBackoffMs: 15000
      outboundMinIntervalMs: 1500
      stateFile: "~/.openclaw/wechat-state.json"
```

## 多账号配置示例

```yaml
channels:
  wechat:
    accounts:
      sales:
        enabled: true
        provider: "wechatpadpro"
        apiKey: "sales-key"
        proxyUrl: "http://127.0.0.1:1238"
        webhookHost: "https://claw.example.com"
        webhookPort: 18792
      support:
        enabled: true
        provider: "wechatpadpro"
        apiKey: "support-key"
        proxyUrl: "http://127.0.0.1:1238"
        webhookHost: "https://claw.example.com"
        webhookPort: 18793
```

## 验证

仓库内置最小验证命令：

```bash
npm run verify
```

该命令会执行：

- `npm run typecheck`
- `test-channel.ts`
- `test-plugin.ts`
- `test-business.ts`
- `test-wechatpadpro.ts`
- `test-stability.ts`

如果本机没有准备 Node 环境，可使用 Docker 临时执行：

```bash
docker run --rm -v "$PWD:/app" -w /app node:22-bullseye \
  bash -lc "npm ci --ignore-scripts && npm run verify"
```

## 常见问题

### 插件已安装但没有加载

- 确认 `openclaw-gateway` 已重启
- 查看日志中是否出现 `OpenClaw 微信通道已注册`
- 检查 `channels.wechat.enabled` 是否为 `true`

### 启动后没有二维码

- 检查 `channels.wechat.apiKey` 和 `channels.wechat.proxyUrl`
- 检查代理服务是否可达
- 如果当前账号已经登录，插件不会重复输出二维码

### Webhook 注册失败

- 检查 `webhookHost` 是否可被代理服务访问
- 检查 `webhookPort` 是否已放行
- 如果前方使用了 Nginx 或负载均衡，直接填写完整 `https://` 地址

### 扫码后仍然容易掉线

优先排查代理出口稳定性、登录频率，以及是否与其他协议栈混用。掉线问题通常不是单一由通道插件引起。

## 开发

```bash
npm ci
npm run verify
```

提交前至少补齐对应的验证脚本：

- 规则和策略改动，优先补 `test-business.ts`
- 插件入口和运行时兼容改动，优先补 `test-plugin.ts`
- 通道基础能力改动，优先补 `test-channel.ts`

## 许可证

MIT
