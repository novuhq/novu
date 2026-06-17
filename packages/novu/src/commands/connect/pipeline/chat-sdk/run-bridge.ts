import { type ChildProcess, spawn } from "node:child_process";
import chalk from "chalk";

export type RunChatSdkBridgeInput = {
  projectDir: string;
};

function spawnDevTunnel(command: string, cwd: string): ChildProcess {
  const isWindows = process.platform === "win32";
  const shell = isWindows ? "cmd" : "sh";
  const shellFlag = isWindows ? "/c" : "-c";

  const child = spawn(shell, [shellFlag, command], {
    cwd,
    stdio: "inherit",
    detached: !isWindows,
  });

  child.on("error", (err) => {
    console.error(
      chalk.red(`\n  ✗ Failed to start dev tunnel: ${err.message}`),
    );
  });

  child.on("exit", (code, signal) => {
    if (signal === "SIGINT" || signal === "SIGTERM") {
      process.exit(0);
    }

    process.exit(code ?? 1);
  });

  return child;
}

export async function runChatSdkBridge(
  input: RunChatSdkBridgeInput,
): Promise<void> {
  const devCommand = "npm run dev:novu";

  console.log(chalk.cyan("\nStarting your Chat SDK app and dev tunnel…"));
  console.log(chalk.green(`  ▶ ${devCommand}`));
  console.log(
    chalk.dim("\n  Send a message on your connected channel to test the bot."),
  );
  console.log(chalk.dim("  Press Ctrl+C to stop.\n"));

  spawnDevTunnel(devCommand, input.projectDir);

  await new Promise<void>(() => undefined);
}
