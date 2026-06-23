import path from 'node:path';
import type { InstallTarget } from '../context/detect-install-targets';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth, SubagentBranch } from '../types';

/**
 * Inputs that the main agent forwards to every subagent. They share a
 * preamble (project context the main agent gathered during its survey)
 * and a branch-specific tail.
 */
export interface BuildSubagentPromptInput {
  branch: SubagentBranch;
  project: ProjectContext;
  auth: ResolvedAuth;
  installedSkills: InstalledSkill[];
  /**
   * Whether `@novu/framework` is in the target project's `package.json`.
   * Drives Branch B's workflow path resolution (code-first vs no-code).
   * Branch A and C ignore this field. The flag is decided by the main
   * agent during its survey turn — the wizard never auto-installs
   * `@novu/framework`; its presence is the explicit user signal for the
   * code-first path.
   */
  hasNovuFramework: boolean;
}

/**
 * Builds the prompt the main agent should pass into the `Task` tool's
 * `prompt` parameter when dispatching one of the three parallel subagents.
 *
 * Each subagent owns a coarse domain enforced by `agent/can-use-tool.ts`:
 *   - `inbox`        → client UI files
 *   - `workflows`    → server-side handlers (everything except auth hooks)
 *   - `subscribers`  → auth-provider hook files only
 *
 * **Prompt-authoring rules** (so the wizard ages well):
 *   1. Refer to skills by *function*, not by skill name. Skill names can
 *      change — descriptions of what they teach won't.
 *   2. Don't mention specific component / file / path / package / method /
 *      MCP-tool names in body instructions. Defer to the skill the
 *      subagent reads. The skill is the source of truth.
 *   3. The branch-domain section can describe coarse file *categories*
 *      (e.g. "client UI files", "server-side handlers", "auth hook
 *      files") — that's structural, not implementation detail.
 *
 * **Layout** — the prompt is intentionally split into a static prefix
 * (cacheable across sessions) and a dynamic suffix (per-session):
 *
 *   ┌── static (byte-identical for a given branch — Anthropic prompt-cache hits)
 *   │  intro
 *   │  branch domain + what-to-do + tooling rules
 *   │  final-message JSON contract
 *   ├── dynamic suffix (per-session — invalidates only the suffix, not the prefix)
 *   │  project context (cwd, framework, package manager, TS)
 *   │  environment (Novu API URL, region, environment name)
 *   │  installed skills list (absolute paths under cwd)
 *   └──
 *
 * Branch B's body varies on `hasNovuFramework`, so it produces two static
 * variants instead of one — still cacheable per variant.
 *
 * Each subagent must end its final assistant message with a fenced JSON
 * block (see {@link BranchResult}) so the runner can collect structured
 * results and the TS report builder can render them deterministically.
 */
export function buildSubagentPrompt(input: BuildSubagentPromptInput): string {
  const intro = renderIntro(input.branch);
  const branchBody = renderBranchBody(input);
  const contract = renderJsonContract(input.branch);

  const projectContext = renderProjectContext(input);
  const envContext = renderEnvironment(input);
  const skillsList = renderInstalledSkills(input.project.cwd, input.installedSkills);

  return [intro, '', branchBody, '', contract, '', projectContext, '', envContext, '', skillsList].join('\n');
}

/**
 * Returns a stable subagent type label used by the runner to figure out
 * which branch a `Task` tool call belongs to. The Claude Agent SDK's
 * `Task` tool accepts a free-form `subagent_type` (or, when not set, falls
 * back to its `description`); we use this string in both fields so domain
 * gating in `can-use-tool.ts` can recover the branch reliably.
 */
export function describeSubagentBranch(branch: SubagentBranch): string {
  switch (branch) {
    case 'inbox':
      return 'novu-wizard-inbox';
    case 'workflows':
      return 'novu-wizard-workflows';
    case 'subscribers':
      return 'novu-wizard-subscribers';
    default:
      return 'novu-wizard';
  }
}

/**
 * Inverse of {@link describeSubagentBranch} — used by the runner to tag
 * every observed `Task` invocation with its target branch. Returns `null`
 * when the label doesn't match a known wizard branch (e.g. the agent fired
 * `Task` for an unrelated reason).
 */
export function parseSubagentBranch(label: string | undefined): SubagentBranch | null {
  if (!label) return null;
  const compact = label.toLowerCase();
  if (compact.includes('novu-wizard-inbox')) return 'inbox';
  if (compact.includes('novu-wizard-workflows')) return 'workflows';
  if (compact.includes('novu-wizard-subscribers')) return 'subscribers';

  return null;
}

/**
 * Static intro — byte-identical for a given branch across every session,
 * so it sits at the top of the prompt where Anthropic's prompt cache can
 * hit it. The dynamic project / environment / skills sections come later.
 */
function renderIntro(branch: SubagentBranch): string {
  return [
    `# You are the **${branch}** subagent of the Novu Wizard`,
    '',
    'You are one of three parallel subagents. The main agent has already surveyed the project and installed the Novu packages it needs. Stay strictly inside your branch domain — your sibling subagents own the other domains and the runner will deny edits that cross the boundary.',
    '',
    'This prompt is split into a static instruction prefix (branch domain, what to do, tooling rules, final-message contract) followed by a session-specific tail (project context, environment, installed skills). Read the whole prompt before you start — the tail at the bottom is where the absolute paths to your installed Novu skills live.',
  ].join('\n');
}

/**
 * Dynamic — varies per session. Kept narrow so the suffix is small.
 *
 * Lists only the workspaces that fall in this branch's domain (Inbox →
 * `web` / `fullstack`; Workflows / Subscribers → `api` / `fullstack`).
 * In single-app projects this collapses to one workspace; in monorepos
 * each subagent only sees the apps it can actually edit.
 */
function renderProjectContext(input: BuildSubagentPromptInput): string {
  const { project, branch } = input;
  const relevantTargets = pickRelevantTargets(branch, project.topology.targets);

  const lines: string[] = [
    '## Project context (forwarded by the main agent)',
    `- Project root: \`${project.cwd}\``,
    `- Package manager: ${project.packageManager}`,
    `- TypeScript: ${project.hasTypeScript ? 'yes' : 'no'}`,
  ];

  if (relevantTargets.length === 0) {
    lines.push('- No workspaces match this branch — operate on the project root.');

    return lines.join('\n');
  }

  lines.push('', '### Workspaces in scope for this branch');
  for (const target of relevantTargets) {
    const label = target.workspaceName ?? target.cwd;
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
  }

  return lines.join('\n');
}

/**
 * Filters the topology targets down to the workspaces this branch can
 * legitimately edit:
 *
 * - `inbox` — `web` + `fullstack`
 * - `workflows` — `api` + `fullstack`
 * - `subscribers` — `api` + `fullstack` (auth hooks usually live next
 *   to the API server, but in fullstack apps may live in the same
 *   workspace as the UI)
 */
function pickRelevantTargets(branch: SubagentBranch, targets: InstallTarget[]): InstallTarget[] {
  return targets.filter((target) => {
    const role = target.classification.role;
    if (role === 'fullstack') return true;
    if (branch === 'inbox') return role === 'web';

    return role === 'api';
  });
}

/**
 * Dynamic — varies per session. Kept narrow so the suffix is small.
 */
function renderEnvironment(input: BuildSubagentPromptInput): string {
  const { auth } = input;

  const lines = [
    '## Environment',
    `- Novu API base URL: ${auth.apiUrl}`,
    `- Region: ${auth.region}`,
    auth.environmentName ? `- Active environment: ${auth.environmentName}` : '',
    "- A Novu secret key is already loaded into the agent's LLM proxy headers; do NOT print or store it.",
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Lists every installed skill with the absolute path to its `SKILL.md`.
 * The body instructions refer to skills *by what they teach*, never by
 * name — this list is what lets the agent resolve those descriptions to
 * concrete files. We keep names visible only because they are part of
 * the filesystem path the agent has to read.
 */
function renderInstalledSkills(cwd: string, installedSkills: InstalledSkill[]): string {
  if (installedSkills.length === 0) {
    return [
      '## Installed Novu skills',
      '',
      'No skills were installed for this run. Use your built-in knowledge of the Novu platform, and consult `https://docs.novu.co/llms.txt` (via `WebFetch`) when you need authoritative guidance.',
    ].join('\n');
  }

  const claudeHostSkills = installedSkills.filter((skill) => skill.host === 'claude');
  const skillsToList = claudeHostSkills.length > 0 ? claudeHostSkills : installedSkills;

  const seen = new Set<string>();
  const items: string[] = [];
  for (const skill of skillsToList) {
    if (skill.name === 'legacy-novu-cleanup') continue;
    if (seen.has(skill.name)) continue;
    seen.add(skill.name);
    items.push(`- ${path.join(cwd, skill.destination, 'SKILL.md')}`);
  }

  return [
    '## Installed Novu skills',
    '',
    'Every Novu skill installed for this run is listed below by absolute path. The "What to do" section tells you which kind of skill to look for; open the candidate `SKILL.md` files and pick the one whose description matches the task before doing any work. Skills are the source of truth for which packages, components, methods, paths, and conventions to use — defer to them rather than guessing or relying on this prompt.',
    '',
    ...items,
  ].join('\n');
}

function renderBranchBody(input: BuildSubagentPromptInput): string {
  if (input.branch === 'inbox') return renderInboxBody();
  if (input.branch === 'workflows') return renderWorkflowsBody(input);

  return renderSubscribersBody();
}

function renderInboxBody(): string {
  return [
    '## Branch domain — Inbox client UI',
    '',
    'You may ONLY edit client-side UI files where the notification inbox component would naturally mount alongside the rest of the app shell. You may NOT edit server-side handlers, route handlers, server actions, webhooks, cron / queue handlers, or any auth-provider hook files. Your sibling subagents own those.',
    '',
    '## What to do',
    '1. From the **Installed Novu skills** list, find and read the skill whose description covers integrating the Novu notification inbox into a client app. Treat that skill as the source of truth for which package to import, where to place the component, how to wire its provider/wrapper, and how to style it. Do not guess or use prior knowledge that contradicts the skill.',
    '2. Survey the host project with `Read` / `Glob` / `Grep` to locate the existing app shell. Mount the inbox where the skill recommends, reusing whatever provider / theme wrapper the project already has.',
    '3. Pick up brand styling cues from whatever the project already has, and feed them through the styling hooks the skill documents.',
    '4. Prefer `Edit` over `Write`: splice changes into existing files rather than recreating them.',
    '',
    '## Tooling rules',
    '- Use `Read`, `Edit`, `Write`, `Glob`, `Grep`. Do NOT call other subagents.',
    '- Do NOT run `pnpm lint`, `pnpm tsc`, `pnpm typecheck`, `pnpm check-types`, `pnpm test`, `eslint`, `prettier`, `vitest`, `jest`, or `mocha` (or any package-manager alias for them) — they are denied by the wizard sandbox. The wizard CLI runs ONE lint + ONE typecheck pass after every subagent finishes; retrying inside your turn just burns minutes.',
    '- Do NOT write the wizard report file — the wizard CLI builds the report from your structured result.',
  ].join('\n');
}

function renderWorkflowsBody(input: BuildSubagentPromptInput): string {
  const pathName = input.hasNovuFramework ? 'code-first' : 'no-code';
  const pathSentence = input.hasNovuFramework
    ? 'The wizard has resolved that this run uses the **code-first** workflow path. Find and read the skill(s) describing how to design workflows, define workflows, and serve workflows on the code-first path, plus the skill describing how to fire workflows from server-side code. Follow them literally — they are the source of truth for which packages, helpers, and adapters to use.'
    : 'The wizard has resolved that this run uses the **no-code** workflow path using the Novu MCP server. Find and read the skill(s) describing how to design workflows and how to create them via the dashboard no-code tooling, plus the skill describing how to fire workflows from server-side code. Follow them literally — they are the source of truth for which tools, packages, and conventions to use.';

  return [
    '## Branch domain — Workflows + Triggers (server-side)',
    '',
    'You may edit any server-side handler — route handlers, server actions, webhook handlers, cron / queue handlers, and any framework workflow definition files. You may NOT edit client UI files (Branch A owns those) or auth-provider hook files (Branch C owns those).',
    '',
    `## Workflow path: ${pathName}`,
    `- ${pathSentence}`,
    '',
    '## What to do (in order)',
    '1. **Reason about the business domain.** Read `package.json` (`name` + `description`), the README first paragraph, and a sample of top-level routes. Decide what the product actually does — is this a recipe app, an invoicing SaaS, a course platform, an internal tool? Workflow IDs and copy must derive from product nouns; do NOT default to a generic "welcome / checkout / password reset" trio.',
    '2. **Discover trigger sites yourself.** Use `Glob` / `Grep` / `Read` to find candidate server-side handlers — route handlers, server actions, webhook handlers, cron / queue handlers, domain mutations. For each candidate, follow the call chain to confirm it is reachable from the running app. Never wire a trigger into an orphan handler that nothing invokes.',
    '3. **Create workflows** matching the domain — kebab-case workflow ids derived from product nouns. Use whichever creation mechanism the skill for the resolved workflow path documents.',
    '4. **Wire trigger calls** into each matching server-side handler with `Edit`. Always wrap the call in `try / catch` so a Novu outage never blocks the host transaction. Never move handlers into new files.',
    "5. If a workflow has no real invocation path you can wire it into, do NOT ship a dead trigger. Add it to your structured result's `manualTriggersNeeded` with a short reason — the wizard report will surface that.",
    '',
    '## Tooling rules',
    '- Use `Read`, `Edit`, `Write`, `Glob`, `Grep`, Novu MCP tools. Do NOT call other subagents.',
    '- Do NOT run `pnpm lint`, `pnpm tsc`, `pnpm typecheck`, `pnpm check-types`, `pnpm test`, `eslint`, `prettier`, `vitest`, `jest`, or `mocha` (or any package-manager alias for them) — they are denied by the wizard sandbox. The wizard CLI runs ONE lint + ONE typecheck pass after every subagent finishes; retrying inside your turn just burns minutes.',
    '- Do NOT write the wizard report file — the wizard CLI builds the report from your structured result.',
  ].join('\n');
}

function renderSubscribersBody(): string {
  return [
    '## Branch domain — Subscribers (auth provider hooks)',
    '',
    'You may ONLY edit the auth-provider hook / callback files that fire when users sign up, sign in, or update their profile. You may NOT edit client UI files or non-auth server handlers. If a sign-up handler also legitimately needs a workflow trigger, leave the trigger to Branch B — only add the subscriber sync there.',
    '',
    '## What to do',
    '1. From the **Installed Novu skills** list, find and read the skill whose description covers managing Novu subscribers. Treat that skill as the source of truth for which package, helper, or MCP tool to use, what fields to send, and how to identify the subscriber.',
    '2. Identify the auth provider in use by reading `package.json` and the relevant config / route files.',
    "3. At the auth provider's sign-up, sign-in, and profile-update extension points, sync the subscriber to Novu following the skill's guidance. Use the host app's existing user identity for the subscriber identifier.",
    '4. Wrap every Novu call in `try / catch` so a Novu outage never blocks the auth flow.',
    '',
    '## Tooling rules',
    '- Use `Read`, `Edit`, `Write`, `Glob`, `Grep`, and any Novu MCP tools the skill points you to. Do NOT call other subagents.',
    '- Do NOT run `pnpm lint`, `pnpm tsc`, `pnpm typecheck`, `pnpm check-types`, `pnpm test`, `eslint`, `prettier`, `vitest`, `jest`, or `mocha` (or any package-manager alias for them) — they are denied by the wizard sandbox. The wizard CLI runs ONE lint + ONE typecheck pass after every subagent finishes; retrying inside your turn just burns minutes.',
    '- Do NOT write the wizard report file — the wizard CLI builds the report from your structured result.',
  ].join('\n');
}

function renderJsonContract(branch: SubagentBranch): string {
  return [
    '## Final message contract (REQUIRED)',
    '',
    'End your final assistant message with a fenced JSON code block (and nothing after it). The wizard CLI parses this block to build the user-facing report. Use exactly this shape — empty arrays are fine but every key must be present:',
    '',
    '```json',
    JSON.stringify(
      {
        branch,
        filesChanged: [{ path: 'relative/file.ts', kind: 'edited' }],
        workflowsCreated: [{ id: 'workflow-id', trigger: 'event-name', kind: 'code-first' }],
        triggersWired: [
          { workflowId: 'workflow-id', serverFile: 'path/to/handler.ts:42', uiFile: 'path/to/page.tsx:13' },
        ],
        subscriberSyncPoints: [{ file: 'path/to/auth-callback.ts:21', hook: 'sign-up' }],
        manualTriggersNeeded: [{ workflowId: 'workflow-id', reason: 'no reachable invocation path' }],
        notes: ['short freeform notes the wizard report should surface, if any'],
      },
      null,
      2
    ),
    '```',
    '',
    'If a section does not apply to your branch, return an empty array for it (do NOT omit the key). For example: the Inbox subagent returns empty `workflowsCreated` / `triggersWired` / `subscriberSyncPoints` / `manualTriggersNeeded`.',
  ].join('\n');
}
