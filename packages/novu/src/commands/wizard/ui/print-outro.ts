import chalk from 'chalk';
import { type OutroData, OutroKind } from './wizard-session';

/**
 * Renders an {@link OutroData} payload to stdout as plain ANSI-coloured text.
 *
 * Used in two places:
 *  - the TTY/Ink path calls this from {@link mountWizardUI}'s `onShutdown` so
 *    the outro screen survives the alternate-screen tear-down and stays in
 *    the user's terminal scrollback;
 *  - the non-TTY/CI path calls this from {@link createLoggingUI}'s
 *    `setOutroData` so the run summary is logged alongside every other line.
 *
 * Safe to call with `undefined` (e.g. when the user Ctrl+C's before the
 * pipeline reaches the outro step) — it no-ops in that case.
 */
export function printOutroToStdout(data: OutroData | undefined): void {
  if (!data) return;

  const prefix = outroPrefix(data.kind);
  const lines: string[] = [];

  lines.push('');
  lines.push(`${prefix} ${data.message}`);
  for (const change of data.changes ?? []) {
    lines.push(`  ${chalk.green('•')} ${change}`);
  }
  if (data.reportFile) lines.push(chalk.gray(`  report:    ${data.reportFile}`));
  if (data.dashboardUrl) lines.push(chalk.gray(`  dashboard: ${data.dashboardUrl}`));
  if (data.docsUrl) lines.push(chalk.gray(`  docs:      ${data.docsUrl}`));
  lines.push('');

  process.stdout.write(`${lines.join('\n')}\n`);
}

function outroPrefix(kind: OutroKind): string {
  if (kind === OutroKind.Success) return chalk.green('✓');
  if (kind === OutroKind.Cancel) return chalk.yellow('!');

  return chalk.red('✗');
}
