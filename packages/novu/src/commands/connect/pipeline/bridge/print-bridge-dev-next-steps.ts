import { cyan, dim } from 'picocolors';

export function printBridgeDevNextSteps(opts: { projectDir: string; skippedInstall?: boolean }): void {
  const cmd = opts.skippedInstall
    ? `cd ${opts.projectDir} && npm install && npm run dev:novu`
    : `cd ${opts.projectDir} && npm run dev:novu`;
  const cmdLine = `$ ${cmd}`;
  const innerWidth = Math.max(cmdLine.length + 4, 50);

  console.log();
  console.log(dim(`  ╭${'─'.repeat(innerWidth)}╮`));
  console.log(dim(`  │${' '.repeat(innerWidth)}│`));
  console.log(dim('  │') + `  ${cyan(cmdLine)}${' '.repeat(innerWidth - cmdLine.length - 2)}` + dim('│'));
  console.log(dim(`  │${' '.repeat(innerWidth)}│`));
  console.log(dim(`  ╰${'─'.repeat(innerWidth)}╯`));
  console.log();
  console.log(`  ${dim('npm run dev')}        ${dim('Start app without tunnel')}`);
  console.log(`  ${dim('npm run dev:novu')}   ${dim('Start app + dev tunnel')}`);
  console.log();
}
