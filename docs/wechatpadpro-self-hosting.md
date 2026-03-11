# WeChatPadPro 自托管对接指南

这份文档给开源用户一条完整、可复现的路线：

1. 自己部署 `WeChatPadPro`
2. 安装 `Wechat-Claw`
3. 把 `OpenClaw` 和 `WeChatPadPro` 接到同一条网络链路
4. 通过日志扫码登录微信

注意：

- 本仓库不分发 `WeChatPadPro` 源码，只提供脱敏后的部署模板和对接说明
- `WeChatPadPro` 属于第三方非官方协议方案，稳定性可以优化，风控风险不能归零
- `channels.wechat.apiKey` 应填写业务接口可用的授权 key，不要直接把运维后台的 `ADMIN_KEY` 当成插件侧 `apiKey`

## 仓库内置的示例

- `examples/wechatpadpro/docker-compose.yml`
- `examples/wechatpadpro/.env.example`
- `examples/openclaw/openclaw.wechatpadpro.yaml`
- `examples/nginx/wechat-webhook.conf`

## 一、部署 WeChatPadPro

先准备一个单独目录，例如：

```bash
mkdir -p /opt/wechatpadpro
cd /opt/wechatpadpro
cp /path/to/Wechat-Claw/examples/wechatpadpro/docker-compose.yml .
cp /path/to/Wechat-Claw/examples/wechatpadpro/.env.example .env
```

然后修改 `.env` 里的关键项：

```dotenv
TZ=Asia/Shanghai
ADMIN_KEY=replace-with-a-long-random-string
MYSQL_ROOT_PASSWORD=replace-with-a-long-random-string
MYSQL_PASSWORD=replace-with-a-long-random-string
MYSQL_CONNECT_STR=weixin:replace-with-a-long-random-string@tcp(mysql:3306)/weixin?charset=utf8mb4&parseTime=true&loc=Local
WEB_DOMAIN=your-host-or-domain:1238
```

启动：

```bash
docker compose up -d
```

最小检查：

```bash
docker compose ps
curl http://127.0.0.1:1238/docs/
```

如果你不是本机部署，而是让 `OpenClaw` 从别的主机访问它，把 `127.0.0.1` 换成你的实际服务地址。

## 二、安装 Wechat-Claw

```bash
git clone https://github.com/hkyutong/Wechat-Claw.git
cd Wechat-Claw
openclaw plugins install "$(pwd)"
```

如果你的 `OpenClaw` 跑在 Docker 里：

```bash
docker compose run --rm -v "$PWD:/plugin:ro" openclaw-cli plugins install /plugin
```

## 三、写入 OpenClaw 配置

最小配置参考 `examples/openclaw/openclaw.wechatpadpro.yaml`。

命令行写法：

```bash
openclaw config set channels.wechat.enabled true
openclaw config set channels.wechat.provider "wechatpadpro"
openclaw config set channels.wechat.apiKey "replace-with-your-business-api-key"
openclaw config set channels.wechat.proxyUrl "http://wechatpadpro:1238"
openclaw config set channels.wechat.deviceType "ipad"
openclaw config set channels.wechat.webhookHost "https://your-domain.example.com"
openclaw config set channels.wechat.webhookPort 18792
openclaw config set channels.wechat.webhookPath "/webhook/wechat"
```

字段说明：

- `apiKey`：业务接口使用的授权 key
- `proxyUrl`：`WeChatPadPro` API 地址
- `deviceType`：推荐 `ipad`
- `webhookHost`：`WeChatPadPro` 能回调到的公网地址
- `webhookPort`：本地回调服务端口
- `webhookPath`：建议固定 `/webhook/wechat`

## 四、网络连通方式

### 方案 A：同一个 docker compose 网络

如果 `OpenClaw` 和 `WeChatPadPro` 在同一个 compose 网络里：

- `proxyUrl` 直接写 `http://wechatpadpro:1238`
- `OpenClaw` 不需要额外暴露 `WeChatPadPro` 给公网

### 方案 B：不同主机或不同网络

如果它们不在同一个网络里：

- `proxyUrl` 写 `http://实际IP或域名:1238`
- 要保证 `OpenClaw` 能访问 `WeChatPadPro`
- 要保证 `WeChatPadPro` 能访问 `webhookHost + webhookPath`

## 五、反向代理

如果你已经把 `OpenClaw` 放在 Nginx 后面，可以直接参考：

- `examples/nginx/wechat-webhook.conf`

要点只有两条：

1. `/webhook/wechat` 必须转发到网关实际监听端口
2. 不要对这个路径单独加 Basic Auth 或额外拦截

## 六、启动并扫码

启动网关：

```bash
openclaw gateway start --verbose
```

Docker 场景：

```bash
docker compose restart openclaw-gateway
docker compose logs -f openclaw-gateway
```

正常情况下，日志会打印：

- 终端二维码
- `二维码地址`
- 登录成功提示

你直接扫码即可。

## 七、最小验收

扫码完成后，用微信发：

```text
/status
```

如果链路是通的，至少应该能看到：

- 账号登录成功
- Webhook 已注册
- 消息能进入 `OpenClaw`
- 插件可以回复一条文本

## 八、稳定性建议

`Wechat-Claw` 已经内置：

- 二维码节流
- 启动退避和熔断
- 出站串行化和最小发送间隔
- 登录态持久化

但你仍然应该遵守这些操作纪律：

- 固定稳定出口，不要频繁切代理
- 不要短时间重复扫码和重登
- 同一微信号不要混用别的 Pad/PC 协议组件
- 容器尽量长期在线，不要反复启停

## 九、常见问题

### 1. 日志里没有二维码

先看：

```bash
docker compose logs -f openclaw-gateway
```

如果日志里提示“登录熔断”：

- 这是插件在保护账号，不是死机
- 等待冷却结束，或确认你之前是不是连续刷了太多次二维码

### 2. 扫码后很快掉线

优先检查：

- 是否频繁换 IP
- 是否多个组件同时登录同一个号
- 是否首次登录后又马上重启服务

### 3. `apiKey` 到底该填什么

填能调用业务消息接口的授权 key。

不要默认把 `ADMIN_KEY` 直接塞给 `channels.wechat.apiKey`，除非你自己确认这版 `WeChatPadPro` 就是这么授权的。

不同版本对外暴露的名字可能叫：

- `AuthKey`
- `authcode`
- `key`

但对 `Wechat-Claw` 来说，你只需要填那把“可以正常调用业务 API”的 key。
