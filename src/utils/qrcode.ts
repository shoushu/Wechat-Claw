import qrcodeTerminal from "qrcode-terminal";

/**
 * 优先输出适合日志查看的紧凑二维码，避免在 Docker 日志里被折行。
 */
function shouldUseCompactQRCode(): boolean {
  const columns = process.stdout.columns;
  return !columns || columns < 100;
}

export async function renderTerminalQRCode(content: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    try {
      qrcodeTerminal.generate(
        content,
        { small: shouldUseCompactQRCode() },
        (rendered: string) => resolve(rendered.trimEnd())
      );
    } catch (error) {
      reject(error);
    }
  });
}

export async function displayQRCode(url: string): Promise<void> {
  const rendered = await renderTerminalQRCode(url);

  console.log("\n");
  console.log("=".repeat(60));
  console.log("请使用微信扫描二维码登录");
  console.log("=".repeat(60));
  console.log("\n");
  console.log(rendered);
  console.log("\n");
  console.log("二维码地址:");
  console.log(`   ${url}`);
  console.log("\n");
  console.log("提示: 如果终端中的二维码无法扫描，请复制上面的地址到浏览器打开");
  console.log("=".repeat(60));
  console.log("\n");
}

export function displayLoginSuccess(nickName: string, wcId: string): void {
  console.log("\n");
  console.log("✅".repeat(30));
  console.log("✅                                                          ✅");
  console.log(`✅  登录成功！${" ".repeat(48)}✅`);
  console.log("✅                                                          ✅");
  console.log(`✅  昵称: ${nickName.padEnd(49)}✅`);
  console.log(`✅  微信号: ${wcId.padEnd(47)}✅`);
  console.log("✅                                                          ✅");
  console.log("✅".repeat(30));
  console.log("\n");
}
