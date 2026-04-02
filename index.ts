import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { wechatPlugin } from "./src/channel.js";
import { setWeChatRuntime } from "./src/runtime.js";

export default defineChannelPluginEntry({
  id: "wechat",
  name: "OpenClaw WeChat",
  description: "OpenClaw 微信通道插件，通过 Webhook 接入微信消息",
  plugin: wechatPlugin,
  setRuntime: (runtime) => setWeChatRuntime(runtime),
  registerFull(api: OpenClawPluginApi) {
    // 注册额外的网关方法（如有需要）
    console.log("OpenClaw 微信通道已注册");
  },
});

export { wechatPlugin } from "./src/channel.js";
export type { WechatConfig, WechatAccountConfig, ResolvedWeChatAccount } from "./src/types.js";
