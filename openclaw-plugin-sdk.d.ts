declare module "openclaw/plugin-sdk" {
  export const DEFAULT_ACCOUNT_ID: "default";

  export function emptyPluginConfigSchema(): any;

  export function createReplyPrefixContext(params: any): {
    responsePrefix?: string;
    responsePrefixContextProvider?: (...args: any[]) => any;
    onModelSelected?: (...args: any[]) => any;
  };

  export type ClawdbotConfig = any;
  export type RuntimeEnv = any;
  export type ReplyPayload = {
    text?: string | null;
  };

  export type PluginRuntime = any;

  export type OpenClawPluginApi = {
    runtime: PluginRuntime;
    registerChannel(params: { plugin: any }): void;
  };

  export type ChannelPlugin<ResolvedAccount = any, Probe = unknown, Audit = unknown> = any;
}
