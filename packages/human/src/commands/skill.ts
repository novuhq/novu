import pc from 'picocolors';
import { fail } from '../output';
import { installHumanSkill, resolveSkillHosts, type SkillHost } from '../skills/install-skills';

const KNOWN_HOSTS: readonly SkillHost[] = [
  'claude',
  'cursor',
  'windsurf',
  'copilot',
  'gemini',
  'roo',
  'opencode',
  'kiro',
  'agents',
];

export function installSkillCommand(options: { host?: string[]; cwd?: string; json?: boolean }): void {
  const cwd = options.cwd ?? process.cwd();
  const hosts = parseHosts(options.host);

  try {
    const installed = installHumanSkill(cwd, hosts);

    if (options.json) {
      process.stdout.write(`${JSON.stringify({ installed }, null, 2)}\n`);

      return;
    }

    if (installed.length === 0) {
      process.stdout.write('No coding-agent hosts found or specified — nothing installed.\n');

      return;
    }

    process.stdout.write(`${pc.green('✔')} Installed Novu HITL skills (human-cli, novu-human):\n`);
    for (const entry of installed) {
      process.stdout.write(`  ${pc.dim(entry.destination)}\n`);
    }
    process.stdout.write(
      `\nYour coding agent now knows when to use ${pc.bold('ctx.ask/approve/choose/tell')}, ${pc.bold('novu_human')}, or ${pc.bold('human ask/approve/choose/tell')}.\n`
    );
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

function parseHosts(raw: string[] | undefined): SkillHost[] | undefined {
  if (!raw?.length) {
    return undefined;
  }

  const hosts: SkillHost[] = [];
  for (const value of raw) {
    const normalized = value.trim().toLowerCase();
    if (!(KNOWN_HOSTS as readonly string[]).includes(normalized)) {
      fail(`Unknown host "${value}". Supported: ${KNOWN_HOSTS.join(', ')}.`);
    }
    hosts.push(normalized as SkillHost);
  }

  return hosts;
}

export { resolveSkillHosts };
