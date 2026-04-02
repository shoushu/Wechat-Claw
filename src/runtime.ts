import type {OpenClawPluginApi, PluginRuntime} from "openclaw/plugin-sdk/core";
import {createPluginRuntimeStore} from "openclaw/plugin-sdk/compat";

let runtime: OpenClawPluginApi["runtime"] | null = null;

const store = createPluginRuntimeStore<PluginRuntime>("my-plugin runtime not initialized");


export function setWeChatRuntime(next: PluginRuntime) {
    store.setRuntime(next);
}

export function getWeChatRuntime(): PluginRuntime {
    // store.getRuntime(); // throws if not initialized
    // store.tryGetRuntime(); // returns null if not initialized
    return store.tryGetRuntime();
}
