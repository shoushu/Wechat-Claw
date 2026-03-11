import type {
  WechatAccountConfig,
  WechatConfig,
  WechatChatType,
  WechatInboundPolicy,
  WechatMessageType,
  WechatOperationsPolicy,
  WechatReplyMode,
  WechatReplyPolicy,
  WechatRiskControl,
  WechatRoutingPolicy,
  WechatRoutingRule,
  WechatProvider,
  WechatRuleMatchType,
  WechatSessionMode,
} from "./config-schema.js";

// 重新导出配置类型，方便外部统一引用。
export type {
  WechatConfig,
  WechatAccountConfig,
  WechatChatType,
  WechatInboundPolicy,
  WechatMessageType,
  WechatOperationsPolicy,
  WechatReplyMode,
  WechatReplyPolicy,
  WechatRiskControl,
  WechatRoutingPolicy,
  WechatRoutingRule,
  WechatProvider,
  WechatRuleMatchType,
  WechatSessionMode,
};

export type ResolvedWeChatAccount = {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  name?: string;
  provider: WechatProvider;
  apiKey: string;
  proxyUrl: string;        // 代理服务地址
  wcId?: string;
  isLoggedIn: boolean;
  nickName?: string;
  headUrl?: string;
  deviceType: string;
  proxy: string;
  loginProxyUrl?: string;
  deviceName?: string;
  deviceId?: string;
  webhookHost?: string;    // Webhook 公网地址（IP、域名，或完整 https:// 地址）
  webhookPort: number;
  webhookPath: string;     // Webhook 路径
  webhookSecret?: string;
  webhookMessageTypes?: string[];
  webhookIncludeSelfMessage: boolean;
  webhookRetryCount: number;
  webhookTimeoutSec: number;
  webhookTimestampSkewSec: number;
  natappEnabled: boolean;
  natapiWebPort: number;
  config: WechatAccountConfig;
};

export type LoginStatus =
  | { status: "waiting" }
  | { status: "need_verify"; verifyUrl: string }
  | { status: "logged_in"; wcId: string; nickName: string; headUrl?: string };

export type ProxyClientConfig = {
  provider?: WechatProvider;
  apiKey: string;
  accountId: string;
  baseUrl?: string;
  deviceType?: string;
  proxy?: string;
  loginProxyUrl?: string;
  deviceName?: string;
  deviceId?: string;
  webhookSecret?: string;
  webhookMessageTypes?: string[];
  webhookIncludeSelfMessage?: boolean;
  webhookRetryCount?: number;
  webhookTimeoutSec?: number;
};

export type WechatMessageContext = {
  id: string;
  type: "text" | "image" | "video" | "file" | "voice" | "unknown";
  sender: {
    id: string;
    name: string;
  };
  recipient: {
    id: string;
  };
  content: string;
  timestamp: number;
  threadId: string;
  group?: {
    id: string;
    name: string;
  };
  raw: any;
};
