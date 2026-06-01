import fs from 'node:fs';
import path from 'node:path';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth, SubagentBranch } from '../types';
import { buildSubagentPrompt, describeSubagentBranch } from './build-subagent-prompt';

/**
 * Pre-renders the three wizard subagent prompts into `.claude/agents/*.md`
 * files at the start of every wizard run.
 *
 * Why
 * ---
 * The Claude Agent SDK's `Task` tool reads subagent system prompts from
 * `.claude/agents/<subagent_type>.md` (Claude Code's standard layout —
 * see https://docs.anthropic.com/en/docs/claude-code/agents). When the
 * file exists, the main agent only has to issue
 * `Task({subagent_type, prompt})` with a small dynamic prompt; the SDK
 * injects the file's body as the subagent's system prompt for free.
 *
 * Without this, the main agent generates each subagent's full prompt
 * (~3 long markdown blobs with project context, branch domain, JSON
 * contract, etc.) as model tokens. That dominates the pre-fan-out
 * latency of the wizard agent phase.
 *
 * Lifecycle
 * ---------
 * - {@link installWizardAgents} runs once at the start of `runAgentStep`,
 *   after we have `project` / `auth` / `installedSkills`. It overwrites
 *   any prior wizard agent files so each run gets fresh dynamic context.
 * - {@link cleanupWizardAgents} runs in `runAgentStep`'s `finally` so
 *   the user's `.claude/agents/` directory isn't littered with wizard
 *   files between runs. It only deletes wizard-owned files (matching
 *   the `WIZARD_AGENT_BRANCHES` set) and never touches the user's own
 *   agent files.
 */

const WIZARD_AGENT_BRANCHES: SubagentBranch[] = ['inbox', 'workflows', 'subscribers'];

const AGENTS_DIRNAME = path.join('.claude', 'agents');

export interface InstallWizardAgentsInput {
  cwd: string;
  project: ProjectContext;
  auth: ResolvedAuth;
  installedSkills: InstalledSkill[];
}

export interface InstalledWizardAgent {
  branch: SubagentBranch;
  filePath: string;
}

export function installWizardAgents(input: InstallWizardAgentsInput): InstalledWizardAgent[] {
  const { cwd, project, auth, installedSkills } = input;
  const dir = path.join(cwd, AGENTS_DIRNAME);
  fs.mkdirSync(dir, { recursive: true });

  /**
   * `@novu/framework` is a per-workspace signal — the user only needs
   * one application workspace declaring it for the code-first path to
   * apply. Walk every detected target so monorepos with the package in
   * `apps/api` (but not the root) still take the right branch.
   */
  const hasNovuFramework = project.topology.targets.some((target) => target.installedDeps.has('@novu/framework'));
  const installed: InstalledWizardAgent[] = [];

  for (const branch of WIZARD_AGENT_BRANCHES) {
    const body = buildSubagentPrompt({ branch, project, auth, installedSkills, hasNovuFramework });
    const filePath = path.join(dir, `${describeSubagentBranch(branch)}.md`);
    fs.writeFileSync(filePath, renderAgentFile(branch, body), 'utf8');
    installed.push({ branch, filePath });
  }

  return installed;
}

export function cleanupWizardAgents(cwd: string): void {
  const dir = path.join(cwd, AGENTS_DIRNAME);
  for (const branch of WIZARD_AGENT_BRANCHES) {
    const filePath = path.join(dir, `${describeSubagentBranch(branch)}.md`);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // file already gone — fine
    }
  }
  try {
    /**
     * Only remove the `.claude/agents/` directory if it ended up empty
     * (i.e. the user has no other agent files in there). `rmdirSync`
     * fails noisily on non-empty dirs, which is the behaviour we want.
     */
    fs.rmdirSync(dir);
  } catch {
    // dir non-empty or already gone — fine
  }
}

/**
 * Renders an agent definition file. Format documented at
 * https://docs.anthropic.com/en/docs/claude-code/agents — YAML
 * frontmatter (`name` + `description` required) followed by the
 * markdown system prompt body.
 *
 * `tools` is intentionally omitted so the subagent inherits every tool
 * the main conversation has, matching the wizard's allowlist in
 * `agent/iterator.ts`. `permissionMode` is also omitted because the
 * parent uses `acceptEdits` which always takes precedence — the SDK
 * docs note this explicitly.
 */
function renderAgentFile(branch: SubagentBranch, body: string): string {
  const description = describeBranchForFrontmatter(branch);
  /**
   * Wrap the description in single quotes since it may contain commas.
   * Body is fenced after a blank line per the Claude Code spec.
   */
  const escapedDescription = description.replace(/'/g, "''");

  return [
    `---`,
    `name: ${describeSubagentBranch(branch)}`,
    `description: '${escapedDescription}'`,
    `---`,
    '',
    body,
    '',
  ].join('\n');
}

function describeBranchForFrontmatter(branch: SubagentBranch): string {
  if (branch === 'inbox') {
    return 'Novu wizard subagent for client-side notification inbox UI integration. Use only when the wizard dispatches a Task with this subagent_type.';
  }
  if (branch === 'workflows') {
    return 'Novu wizard subagent for designing workflows and wiring server-side trigger calls. Use only when the wizard dispatches a Task with this subagent_type.';
  }

  return 'Novu wizard subagent for syncing subscribers from the project auth provider. Use only when the wizard dispatches a Task with this subagent_type.';
}
