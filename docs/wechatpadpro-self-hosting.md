# WeChatPadPro 部署详解

本文说明 `OpenClaw + Wechat-Claw + WeChatPadPro` 的完整部署链路，覆盖架构关系、端口方向、Nginx 回调、扫码登录和最小验收。

本仓库不分发 `WeChatPadPro` 源码，只提供脱敏后的部署模板和对接说明。

## 一、四层关系

按职责拆分，这套链路是四层：

| 组件 | 角色 | 主要职责 |
| --- | --- | --- |
| `OpenClaw` | 宿主网关 | 加载插件、维护会话、调用模型、调工具、执行 Agent |
| `Wechat-Claw` | 微信通道插件 | 接收微信消息并转交给 `OpenClaw`，再把 `OpenClaw` 的回复发回微信 |
| `WeChatPadPro` | 微信代理后端 | 登录微信、接收微信消息、发送微信消息 |
| `Nginx / 公网入口` | 回调入口 | 把 `WeChatPadPro` 的 Webhook 请求转发到 `OpenClaw` 的回调端口 |

补充一点：

- `Nginx` 不是必须叫 `Nginx`，也可以是其他反向代理、Ingress 或负载均衡。
- 必须满足的条件只有一个：`WeChatPadPro` 能访问到 `webhookHost + webhookPath`，并最终转发到 `OpenClaw` 的回调服务。

## 二、先看清楚消息方向

这套链路有两个方向，最容易配反的就是这里。

### 1. 入站方向

微信用户发消息后，链路如下：

1. 微信消息进入 `WeChatPadPro`
2. `WeChatPadPro` 把消息回调到 `webhookHost + webhookPath`
3. `Nginx` 把这个请求转发到 `OpenClaw` 的 webhook 监听端口
4. `Wechat-Claw` 解析消息并交给 `OpenClaw`
5. `OpenClaw` 执行模型、工具或 Agent

### 2. 出站方向

`OpenClaw` 生成回复后，链路如下：

1. `OpenClaw` 把回复交给 `Wechat-Claw`
2. `Wechat-Claw` 调用 `WeChatPadPro` 的发消息接口
3. `WeChatPadPro` 把消息发回微信

### 3. 两个关键配置

这两个字段分别对应两个方向：

- `proxyUrl`：`Wechat-Claw -> WeChatPadPro`
- `webhookHost + webhookPath`：`WeChatPadPro -> OpenClaw`

很多部署失败不是服务没起来，而是把这两个方向写反了。

## 三、部署前准备

开始前至少准备好下面这些条件：

- 一台可运行 Docker 的主机，用于部署 `WeChatPadPro`
- 一套可运行 `OpenClaw` 的环境
- 一个能被 `WeChatPadPro` 访问到的公网域名或公网 IP
- 反向代理或公网入口，用于转发 `/webhook/wechat`

本文默认使用这些端口：

- `WeChatPadPro API`：`1238`
- `OpenClaw webhook`：`18792`
- `OpenClaw 网关入口示例`：`18789`
- `Webhook 路径`：`/webhook/wechat`

如果你的实际端口不同，命令和配置里的端口一起替换即可。

## 四、步骤 1：部署 WeChatPadPro

先准备单独目录：

```bash
mkdir -p /opt/wechatpadpro
cd /opt/wechatpadpro
cp /path/to/Wechat-Claw/examples/wechatpadpro/docker-compose.yml .
cp /path/to/Wechat-Claw/examples/wechatpadpro/.env.example .env
```

然后修改 `.env`。至少要确认下面这些字段：

```dotenv
WECHATPADPRO_API_PORT=1238
TZ=Asia/Shanghai
ADMIN_KEY=replace-with-a-long-random-string
MYSQL_ROOT_PASSWORD=replace-with-a-long-random-string
MYSQL_PASSWORD=replace-with-a-long-random-string
MYSQL_CONNECT_STR=weixin:replace-with-a-long-random-string@tcp(mysql:3306)/weixin?charset=utf8mb4&parseTime=true&loc=Local
WEB_DOMAIN=your-host-or-domain:1238
```

字段说明：

- `WECHATPADPRO_API_PORT`：代理 API 暴露端口，`Wechat-Claw` 通过它访问 `WeChatPadPro`
- `ADMIN_KEY`：管理密钥。某些版本同时把它作为业务接口鉴权 key 使用
- `MYSQL_*`：数据库初始化参数
- `WEB_DOMAIN`：`WeChatPadPro` 对外暴露的地址，通常写主机名或域名加端口

启动服务：

```bash
docker compose up -d
```

最小检查：

```bash
docker compose ps
curl http://127.0.0.1:1238/docs/
```

如果 `OpenClaw` 不在同一台机器，把 `127.0.0.1` 换成 `OpenClaw` 实际可访问到的地址。

## 五、步骤 2：确认 WeChatPadPro 的鉴权 key

`channels.wechat.apiKey` 填的不是固定名字，而是“那把能成功调用 `WeChatPadPro` 业务接口的 key”。

`Wechat-Claw` 目前会同时尝试这些方式：

- `Authorization: Bearer <apiKey>`
- URL 查询参数里的 `key=<apiKey>`
- URL 查询参数里的 `authcode=<apiKey>`

因此：

- 如果你的 `WeChatPadPro` 版本直接用 `ADMIN_KEY` 调业务接口，就把 `ADMIN_KEY` 填到 `channels.wechat.apiKey`
- 如果你的版本有单独的业务接口 key，就填那把业务 key

判断标准很简单：这把 key 能不能让 `Wechat-Claw` 正常拿到二维码、查询登录状态、发送消息。

## 六、步骤 3：安装 Wechat-Claw

在 `OpenClaw` 所在环境安装插件：

```bash
git clone git@github.com:hkyutong/Wechat-Claw.git
cd Wechat-Claw
openclaw plugins install "$(pwd)"
```

如果 `OpenClaw` 运行在 Docker 中：

```bash
docker compose run --rm -v "$PWD:/plugin:ro" openclaw-cli plugins install /plugin
```

## 七、步骤 4：写入 OpenClaw 配置

最小配置可直接参考：

- `examples/openclaw/openclaw.wechatpadpro.yaml`

命令行写法：

```bash
openclaw config set channels.wechat.enabled true
openclaw config set channels.wechat.provider "wechatpadpro"
openclaw config set channels.wechat.apiKey "replace-with-your-real-api-key"
openclaw config set channels.wechat.proxyUrl "http://wechatpadpro:1238"
openclaw config set channels.wechat.deviceType "ipad"
openclaw config set channels.wechat.webhookHost "https://your-domain.example.com"
openclaw config set channels.wechat.webhookPort 18792
openclaw config set channels.wechat.webhookPath "/webhook/wechat"
```

字段说明：

- `apiKey`：步骤 2 中确认过的可用鉴权 key
- `proxyUrl`：`Wechat-Claw` 访问 `WeChatPadPro` 的地址
- `deviceType`：常用值为 `ipad`
- `webhookHost`：`WeChatPadPro` 回调时访问的公网入口
- `webhookPort`：`OpenClaw` 本地 webhook 监听端口
- `webhookPath`：建议固定为 `/webhook/wechat`

完整回调地址会被拼成：

```text
https://your-domain.example.com/webhook/wechat
```

### 网络写法

如果 `OpenClaw` 和 `WeChatPadPro` 在同一个 Docker 网络中：

- `proxyUrl` 直接写 `http://wechatpadpro:1238`

如果它们不在同一个网络中：

- `proxyUrl` 写成 `http://实际IP或域名:1238`

无论哪种方式，都要同时满足：

- `OpenClaw` 能访问 `proxyUrl`
- `WeChatPadPro` 能访问 `webhookHost + webhookPath`

## 八、步骤 5：配置 Nginx 或其他公网入口

这一步的目标只有一个：让外部的

```text
https://your-domain.example.com/webhook/wechat
```

最终转发到本地的

```text
http://127.0.0.1:18792/webhook/wechat
```

仓库示例文件：

- `examples/nginx/wechat-webhook.conf`

示例配置中的关键片段如下：

```nginx
location /webhook/wechat {
  proxy_pass http://127.0.0.1:18792/webhook/wechat;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 300s;
}
```

这里要注意三件事：

1. 路径必须和 `webhookPath` 一致
2. 转发目标必须是 `OpenClaw` 实际监听的 webhook 端口
3. 不要给这个路径再加 Basic Auth、二次跳转或额外拦截

## 九、步骤 6：启动 OpenClaw 并获取二维码

建议启动顺序：

1. 先启动 `WeChatPadPro`
2. 再启动 `OpenClaw`

启动网关：

```bash
openclaw gateway start --verbose
```

Docker 场景：

```bash
docker compose restart openclaw-gateway
docker compose logs -f openclaw-gateway
```

正常情况下，日志里会看到：

- 二维码文本
- 二维码链接
- Webhook 注册结果

扫码完成后，日志应继续出现登录成功或在线状态相关输出。

## 十、步骤 7：最小验收

按下面顺序检查：

### 1. WeChatPadPro 正常

```bash
curl http://your-wechatpadpro-host:1238/docs/
```

### 2. OpenClaw 启动正常

确认网关日志里没有明显的鉴权错误、连接错误或熔断错误。

### 3. Webhook 已能回调

确认日志里出现 webhook 注册成功，或者至少没有注册失败提示。

### 4. 微信消息能进来

扫码登录后，用微信给机器人发：

```text
/status
```

验收通过时，至少应满足：

- `WeChatPadPro` 已登录
- `OpenClaw` 收到这条消息
- `Wechat-Claw` 返回一条文本回复

## 十一、常见错误

### 1. `proxyUrl` 和 `webhookHost` 写反

记住：

- `proxyUrl` 是 `OpenClaw -> WeChatPadPro`
- `webhookHost + webhookPath` 是 `WeChatPadPro -> OpenClaw`

### 2. `apiKey` 填错

如果日志里表现为：

- 拿不到二维码
- 登录状态查询失败
- 发消息返回未授权

优先检查 `channels.wechat.apiKey`。

### 3. 回调地址不能从外部访问

如果 `WeChatPadPro` 访问不到：

```text
https://your-domain.example.com/webhook/wechat
```

消息就到不了 `OpenClaw`。

### 4. 同一个微信号混用了别的协议链路

同一账号同时接入其他 Pad/PC 协议组件时，更容易掉线或被风控。

### 5. 频繁重启、频繁重登、频繁换出口 IP

这会增加二维码失效、登录熔断和掉线概率。

## 十二、仓库内对应文件

本文涉及的仓库文件如下：

- 部署详解：`docs/wechatpadpro-self-hosting.md`
- `WeChatPadPro` compose：`examples/wechatpadpro/docker-compose.yml`
- `WeChatPadPro` 环境变量：`examples/wechatpadpro/.env.example`
- `OpenClaw` 配置示例：`examples/openclaw/openclaw.wechatpadpro.yaml`
- Nginx 示例：`examples/nginx/wechat-webhook.conf`
