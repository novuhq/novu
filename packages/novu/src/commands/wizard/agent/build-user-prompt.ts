import path from 'node:path';
import type { InstallPackagesResult } from '../pipeline/steps/install-packages';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth } from '../types';
import type { WizardGoal } from '../ui/wizard-session';
import { describeSubagentBranch } from './build-subagent-prompt';

export interface BuildUserPromptInput {
  project: ProjectContext;
  auth: ResolvedAuth;
  goal: WizardGoal;
  installedSkills: InstalledSkill[];
  /**
   * Outcome of the wizard's pre-install pipeline step. When present, the
   * prompt switches STEP 3 from "install packages" to "packages already
   * installed" and renders a per-workspace topology block so the agent
   * knows which workspace is `web` / `api` / `fullstack` and which
   * packages are already on disk.
   */
  installResult?: InstallPackagesResult;
}

/**
 * The autonomous user message for the **main** agent.
 *
 * The wizard runs the main agent as an orchestrator that:
 *   1. Surveys the project (read-only).
 *   2. Installs the right Novu packages.
 *   3. Dispatches three parallel `Task` subagents (Inbox / Workflows+Triggers /
 *      Subscribers) in a single assistant message so they run concurrently.
 *   4. Aggregates each subagent's structured JSON result into one final JSON
 *      block in its own final message and ends the turn.
 *
 * The CLI builds `novu-wizard-report.md` from the tool-call trail + the
 * aggregated JSON (see `report/build-report.ts`). The agent does NOT write
 * the report file itself.
 */
export function buildUserPrompt(input: BuildUserPromptInput): string {
  const { project, auth, goal, installedSkills, installResult } = input;

  const projectContextLines = [
    `- Project root: \`${project.cwd}\``,
    `- Package manager: ${project.packageManager}`,
    `- TypeScript: ${project.hasTypeScript ? 'yes' : 'no'}`,
  ];

  const environmentLines = [
    `- Novu API base URL: ${auth.apiUrl}`,
    `- Region: ${auth.region}`,
    auth.environmentName ? `- Active environment: ${auth.environmentName}` : '',
    "- A `NOVU_SECRET_KEY` is already loaded into the agent's LLM proxy headers; the agent does NOT need to print or store it.",
    '- For client snippets, instruct the user to set `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` (NOT the secret key).',
  ].filter(Boolean);

  const skillSection = renderSkillSection(project.cwd, installedSkills);
  const taskList = renderTaskList(goal);
  const topologySection = renderTopologySection(project, installResult);
  const steps = renderSteps(goal, installResult);

  const sections: string[] = [
    `# Goal`,
    `${describeGoalLine(goal)}`,
    '',
    `## Project context`,
    ...projectContextLines,
    '',
    `## Environment`,
    ...environmentLines,
    '',
    installResult
      ? `## Workspace topology (already installed by the wizard CLI)`
      : `## Workspace topology (detected during bootstrap)`,
    topologySection,
    '',
    `## Installed Novu skills`,
    skillSection,
    '',
    `## Required task list (your first \`TodoWrite\` call)`,
    'Use exactly these task strings (with the matching `activeForm`s) so the UI renders consistent labels:',
    ...taskList,
    'Mark exactly one task `in_progress` at a time. Mark a task `completed` immediately after its work is done.',
    '',
    `## Instructions (follow these STEPS in order — do not skip or reorder)`,
    ...steps,
  ];

  return sections.join('\n');
}

function renderTopologySection(project: ProjectContext, installResult?: InstallPackagesResult): string {
  const topology = project.topology;
  const lines: string[] = [];

  if (installResult) {
    lines.push(
      `Package manager: \`${installResult.packageManager.label}\` (\`${installResult.packageManager.installCommand}\`).`,
      ''
    );

    if (installResult.requestedGoal !== installResult.effectiveGoal) {
      lines.push(
        `**Goal rebalanced** from \`${installResult.requestedGoal}\` → \`${installResult.effectiveGoal}\` — ${installResult.rebalanceReason}`,
        ''
      );
    }
  } else {
    lines.push(`Package manager: \`${project.packageManager}\`.`, '');
  }

  if (topology.targets.length === 0) {
    lines.push('No application workspaces detected — operate on the project root.');

    return lines.join('\n');
  }

  lines.push('Application workspaces (the agent should ONLY edit code inside these — libraries are skipped):');
  for (const target of topology.targets) {
    const label = target.workspaceName ?? target.cwd;
    const installOutcome = installResult?.targets.find((t) => t.cwd === target.cwd);
    const role = target.classification.role;
    const framework = target.classification.framework;

    const frameworkSegment = framework !== 'unknown' ? `, framework \`${framework}\`` : '';
    lines.push(`- \`${label}\` (\`${role}\`${frameworkSegment}, cwd \`${target.cwd}\`)`);
    if (target.installedNovuPackages.length > 0) {
      lines.push(`  - Pre-existing Novu packages: ${target.installedNovuPackages.map((p) => `\`${p}\``).join(', ')}`);
    }
    if (target.hasFrameworkRoute && target.frameworkRoutePath) {
      lines.push(`  - Existing @novu/framework route: \`${target.frameworkRoutePath}\``);
    }
    if (installResult && installOutcome) {
      if (installOutcome.packagesInstalled.length > 0) {
        lines.push(`  - Installed by wizard: ${installOutcome.packagesInstalled.map((p) => `\`${p}\``).join(', ')}`);
      }
      if (installOutcome.packagesEditedDirectly.length > 0) {
        lines.push(
          `  - Declared in \`package.json\` only (install failed — the user must run \`${installResult.packageManager.family} install\` afterwards): ${installOutcome.packagesEditedDirectly
            .map((p) => `\`${p}\``)
            .join(', ')}`
        );
      }
      if (installOutcome.packagesRequested.length === 0) {
        lines.push('  - All required packages were already present.');
      }
    }
  }

  const libraryWorkspaces = topology.workspaces.filter((ws) => ws.classification.role === 'library');
  if (libraryWorkspaces.length > 0) {
    lines.push('', 'Library workspaces (skipped — do NOT install or edit code there):');
    for (const ws of libraryWorkspaces) {
      const label = ws.workspaceName ?? ws.cwd;
      lines.push(`- \`${label}\` — ${ws.classification.reason}`);
    }
  }

  return lines.join('\n');
}

function renderSkillSection(cwd: string, installedSkills: InstalledSkill[]): string {
  if (installedSkills.length === 0) {
    return [
      'No skills were installed for this run. Use your built-in knowledge of the Novu API,',
      'and consult `https://docs.novu.co/llms.txt` (via `WebFetch`) when you need authoritative guidance.',
    ].join('\n');
  }

  const claudeHostSkills = installedSkills.filter((skill) => skill.host === 'claude');
  const skillsToList = claudeHostSkills.length > 0 ? claudeHostSkills : installedSkills;

  const dedupedByName = new Map<string, InstalledSkill>();
  for (const skill of skillsToList) {
    if (!dedupedByName.has(skill.name)) dedupedByName.set(skill.name, skill);
  }

  const lines = Array.from(dedupedByName.values())
    .filter((skill) => skill.name !== 'legacy-novu-cleanup')
    .map((skill) => {
      const absoluteDir = path.join(cwd, skill.destination);

      return `- \`${skill.name}\` → ${path.join(absoluteDir, 'SKILL.md')}`;
    });

  return [
    'The following Novu skills have been pre-installed on disk. The main agent does NOT need to read every',
    'one — each subagent reads only the SKILL.md(s) the wizard tells it to. The full list is included so the',
    'main agent can forward the right paths to each subagent in `STEP 4` below:',
    '',
    ...lines,
    '',
    'Do NOT call the `Skill` tool to "discover" these — read them directly with the `Read` tool when needed.',
  ].join('\n');
}

function renderTaskList(goal: WizardGoal): string[] {
  const items: string[] = ['1. "Assess project context" / activeForm "Assessing project context"'];

  let n = 2;
  if (goal === 'inbox' || goal === 'full') {
    items.push(`${n++}. "Add Inbox component" / activeForm "Adding Inbox component"`);
  }
  if (goal === 'workflows' || goal === 'full') {
    items.push(`${n++}. "Create workflows" / activeForm "Creating workflows"`);
    items.push(`${n++}. "Wire trigger call sites" / activeForm "Wiring trigger call sites"`);
  }
  if (goal === 'full') {
    items.push(`${n++}. "Sync subscribers from auth provider" / activeForm "Syncing subscribers"`);
  }

  return items;
}

function renderSteps(goal: WizardGoal, installResult?: InstallPackagesResult): string[] {
  const steps: string[] = [];
  const wantsInbox = goal === 'inbox' || goal === 'full';
  const wantsWorkflows = goal === 'workflows' || goal === 'full';
  const wantsSubscribers = goal === 'full';

  const installLine = installResult
    ? 'STEP 3: Packages have ALREADY been installed by the wizard CLI before this turn started — see the "Workspace topology" section above. Do NOT call `npm install` / `pnpm add` / `yarn add` / `bun add` (those Bash prefixes are blocked). When code in STEP 4 needs a package that the topology says is missing, write the import anyway and add a NOTE for the subagent so the wizard report can flag it; never retry the install.'
    : 'STEP 3: Trust the existing `package.json` — the wizard CLI handles installs outside this turn. Never call `npm install` / `pnpm add` / `yarn add` / `bun add` (those prefixes are blocked). If a package you would normally import is missing, write the import anyway and add a NOTE for the subagent.';

  steps.push(
    [
      'STEP 1: Make the canonical TodoWrite call now (using the task list above).',
      'STEP 2: Survey the project once. Use `Read`/`Glob`/`Grep` to extract:',
      '  - business use case from `package.json` (`name`, `description`), top of `README.md`, top-level routes (`app/**/page.tsx`, `pages/**/*.tsx`, `src/routes/**`);',
      '  - brand tokens from `tailwind.config.{ts,js}` (`theme.extend.colors`, `fontFamily`, `borderRadius`), CSS variables in `app/globals.css` / `src/index.css`, `components.json`, logo assets in `public/`;',
      '  - auth provider in use (Clerk, Better Auth, NextAuth, Supabase) — drives `subscriberId`;',
      '  - the workflow path: when `@novu/framework` is already installed in any application workspace, treat it as **code-first**; otherwise the workflow subagent will use the no-code MCP path. Do NOT install `@novu/framework` here — the wizard CLI made that decision before this turn.',
      '  Findings are INTERNAL CONTEXT — do NOT echo them back to the user. You forward them to the subagents in STEP 4.',
      installLine,
    ].join('\n')
  );

  steps.push(
    [
      'STEP 4 — DISPATCH the parallel subagents (CRITICAL):',
      '  Issue all applicable `Task` tool calls in the **same assistant message** so they run concurrently. The full subagent system prompt for each branch (project context, branch domain, what-to-do, final-message contract) has already been written to `.claude/agents/<subagent_type>.md` by the wizard CLI — the SDK injects it automatically when you set `subagent_type`. Your `prompt` parameter therefore only needs to carry per-run dynamic context the subagent cannot see otherwise.',
      '',
      '  For each `Task` call, set:',
      `    - \`subagent_type\`: one of \`${describeSubagentBranch('inbox')}\` / \`${describeSubagentBranch('workflows')}\` / \`${describeSubagentBranch('subscribers')}\`.`,
      '    - `description`: a short human-readable label (also contains the wizard branch label).',
      '    - `prompt`: a SHORT message (3-6 lines) carrying ONLY the per-run dynamic context you gathered in STEP 2 that the subagent cannot rederive — for the Inbox branch, the brand-styling cues you saw (theme tokens, shadcn registry); for the Workflows branch, the business-domain summary (product description, top-level routes) and the resolved workflow path (`code-first` if `@novu/framework` is installed, otherwise `no-code`); for the Subscribers branch, the detected auth-provider name. Do NOT repeat the project context, environment, installed-skills list, branch domain, or JSON contract — those are already in the agent file.',
      '',
      '  Branches to dispatch in this run:',
      ...renderBranchesToDispatch({ wantsInbox, wantsWorkflows, wantsSubscribers }),
      '',
      '  Each subagent ends its final assistant message with a fenced JSON block — the wizard CLI parses those directly off the message stream, so once every dispatched `Task` has returned, simply end the turn. Do NOT write `novu-wizard-report.md`, do NOT echo or aggregate the subagent results, do NOT call subagents recursively from inside a subagent — the wizard CLI builds the report from the streamed JSON blocks and the tool trail.',
    ].join('\n')
  );

  steps.push(
    [
      '',
      'Documentation lookup (when a SKILL.md or your prior knowledge is insufficient):',
      '- Authoritative source: https://docs.novu.co (Mintlify-hosted, LLM-friendly).',
      '- Index of every doc page: `WebFetch` `https://docs.novu.co/llms.txt`. Fetch this once per session when you need to discover what topics exist.',
      '- Any page can be fetched as clean markdown by appending `.md` to its URL.',
      '- Only `docs.novu.co` is auto-allowed for `WebFetch`. Do not try to fetch other domains.',
    ].join('\n')
  );

  return steps;
}

function renderBranchesToDispatch(options: {
  wantsInbox: boolean;
  wantsWorkflows: boolean;
  wantsSubscribers: boolean;
}): string[] {
  const lines: string[] = [];
  if (options.wantsInbox) {
    lines.push(`    - \`${describeSubagentBranch('inbox')}\` — Inbox client UI`);
  }
  if (options.wantsWorkflows) {
    lines.push(`    - \`${describeSubagentBranch('workflows')}\` — Workflows + Triggers (server-side)`);
  }
  if (options.wantsSubscribers) {
    lines.push(
      `    - \`${describeSubagentBranch('subscribers')}\` — Subscribers (auth hooks). Skip this branch only if STEP 2 found NO auth provider; otherwise dispatch it.`
    );
  }
  if (lines.length === 0) {
    lines.push('    - (no branches for this goal — should not happen; reach out to the wizard maintainers)');
  }

  return lines;
}

function describeGoalLine(goal: WizardGoal): string {
  if (goal === 'inbox') {
    return 'Inbox-only integration: render the Inbox component with full personalisation.';
  }
  if (goal === 'workflows') {
    return 'Workflows + triggers integration (no Inbox UI in this run): create workflows and wire `novu.trigger` calls at the matching call sites.';
  }

  return 'Full Novu integration: Inbox + workflows + triggers + subscribers, end-to-end.';
}
