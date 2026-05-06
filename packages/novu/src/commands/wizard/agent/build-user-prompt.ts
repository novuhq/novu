import path from 'node:path';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth } from '../types';
import type { WizardGoal } from '../ui/wizard-session';

export interface BuildUserPromptInput {
  project: ProjectContext;
  auth: ResolvedAuth;
  goal: WizardGoal;
  installedSkills: InstalledSkill[];
}

/**
 * The autonomous user message.
 *
 * The system prompt only carries commandments (negative guardrails). All
 * goal-specific guidance — project context, the explicit skill paths to
 * follow, and the numbered STEPs — lives here so the model is told *exactly*
 * what to do, in what order, with which tool. Experience shows the
 * agent ships materially more code edits when the prompt is STEP-numbered
 * and references concrete tool names per step.
 */
export function buildUserPrompt(input: BuildUserPromptInput): string {
  const { project, auth, goal, installedSkills } = input;

  const projectContextLines = [
    `- Project root: \`${project.cwd}\``,
    `- Framework: ${project.framework}`,
    `- Package manager: ${project.packageManager}`,
    `- TypeScript: ${project.hasTypeScript ? 'yes' : 'no'}`,
    `- Installed Novu packages: ${
      project.installedNovuPackages.length ? project.installedNovuPackages.join(', ') : 'none yet'
    }`,
    project.hasFrameworkRoute && project.frameworkRoutePath
      ? `- Existing @novu/framework route: ${project.frameworkRoutePath}`
      : '- No existing @novu/framework route detected',
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
  const steps = renderSteps(goal, project);

  return [
    `# Goal`,
    `${describeGoalLine(goal)}`,
    '',
    `## Project context`,
    ...projectContextLines,
    '',
    `## Environment`,
    ...environmentLines,
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
    '',
    `## Final report`,
    'Your last action must be `Write ./novu-wizard-report.md` (in the project root) with these sections:',
    '- `# Novu Wizard Report` (heading)',
    `- \`## Goal\` (one-line restating: ${describeGoalLine(goal)})`,
    '- `## Project context` (framework, package manager, auth provider, brand tokens summary — short bullets)',
    '- `## Files changed` (relative paths grouped by type: created / edited)',
    '- `## Workflows created` (workflowId → trigger event name)',
    '- `## Trigger sites wired` (one bullet per workflow: `workflowId` — `server file:line` invoked by `UI file:line` (or external webhook / auth callback / cron). If the invocation is a UI control you added, mark it `(new)`.)',
    '- `## Manual triggers needed` (workflows you created but could NOT wire to a real invocation path — `workflowId` + one-line note on what the user should do; omit the section if empty)',
    '- `## Subscriber sync points` (file:line)',
    '- `## Next steps` (env vars to set, dashboard URL hint, how to test locally)',
    'Keep the report under ~120 lines. After writing the report, end the turn — do not say goodbye, do not ask questions.',
  ].join('\n');
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
    'The following Novu skills have been pre-installed on disk. Read each `SKILL.md` once at the start',
    'of your run and follow its instructions whenever a STEP below names that skill:',
    '',
    ...lines,
    '',
    'Do NOT call the `Skill` tool to "discover" these — read them directly with the `Read` tool.',
  ].join('\n');
}

function renderTaskList(goal: WizardGoal): string[] {
  const items: string[] = ['1. "Assess project context" / activeForm "Assessing project context"'];

  items.push('2. "Install Novu packages" / activeForm "Installing Novu packages"');

  let n = 3;
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
  items.push(`${n++}. "Write integration report" / activeForm "Writing integration report"`);

  return items;
}

function renderSteps(goal: WizardGoal, project: ProjectContext): string[] {
  const steps: string[] = [];
  const hasFramework = project.installedNovuPackages.includes('@novu/framework');

  steps.push(
    [
      'STEP 1: Make the canonical TodoWrite call now (using the task list above).',
      'STEP 2: Survey the project once. Use `Read`/`Glob`/`Grep` to extract:',
      '  - business use case from `package.json` (`name`, `description`), top of `README.md`, top-level routes (`app/**/page.tsx`, `pages/**/*.tsx`, `src/routes/**`);',
      '  - brand tokens from `tailwind.config.{ts,js}` (`theme.extend.colors`, `fontFamily`, `borderRadius`), CSS variables in `app/globals.css` / `src/index.css`, `components.json`, logo assets in `public/`;',
      '  - auth provider in use (Clerk, Better Auth, NextAuth, Supabase) — drives `subscriberId`;',
      '  - candidate trigger events from sign-up / sign-in handlers, checkout / Stripe webhooks, and domain mutations. For EACH candidate, also locate the invocation path that reaches it: the UI control that fires it (button `onClick`, `<form action={serverAction}>`, `<form>` posting to a route, `fetch("/api/...")` from a client component, `useFormStatus`/`useActionState` callers) OR an external trigger (Stripe-style webhook, auth callback, cron/queue). Record both the server site and the invocation site as `server file:line ← UI file:line` so STEP 6 can verify the trigger is reachable.',
      '  Findings are INTERNAL CONTEXT — do NOT echo them back to the user or paste them into the report.',
      'STEP 3: Install required Novu packages with the detected package manager. Run the install in the foreground (you have `Bash(npm install:*)` etc. auto-approved). The exact package set depends on the goal — see the relevant SKILL.md.',
    ].join('\n')
  );

  if (goal === 'inbox' || goal === 'full') {
    steps.push(
      [
        'STEP 4 (Inbox): Read the `inbox` SKILL.md (path listed above) and implement the `Inbox` component.',
        '  - Style the `Inbox` component with the brand tokens you extracted.',
        "  - Reuse the project's existing Provider/Theme wrapper when one exists.",
        '  - Use `Edit` (not `Write`) to insert the import + JSX into the existing layout/header file rather than recreating it.',
      ].join('\n')
    );
  }

  if (goal === 'workflows' || goal === 'full') {
    if (hasFramework) {
      steps.push(
        [
          'STEP 5 (Workflows — code-first): `@novu/framework` is installed. Read the `framework` SKILL.md and:',
          '  - Define each workflow you identified in STEP 2 in code (kebab-case `workflowId`, derived from product nouns).',
          '  - When a workflow includes an email step, render the body with `@react-email/components` and apply the brand (primary-color buttons, logo header, neutral background, footer with the product name). Add `@react-email/components` via the detected package manager if missing.',
          '  - Serve workflows via the framework adapter (Next.js route handler, Express middleware, etc.) — match the framework conventions of the project.',
        ].join('\n')
      );
    } else {
      steps.push(
        [
          'STEP 5 (Workflows — no-code): `@novu/framework` is NOT installed. Use the Novu MCP server (tools prefixed `mcp__novu__*`, all auto-approved) to create each workflow you identified in STEP 2:',
          '  - Before ANY `mcp__novu__*` call, read both `design workflow` SKILL.md and `dashboard workflows` SKILL.md files from the paths listed under "Installed Novu skills" above. Do NOT plan workflows or fill in step controls from prior knowledge — these two skills are the source of truth.',
          '  - Call `mcp__novu__create_workflow` per workflow with a kebab-case `workflowId` derived from product nouns (e.g. `welcome-{productSlug}` rather than generic `welcome-onboarding-email`).',
          '  - For step content (subject, body, `editorType`, headers, conditions), follow `dashboard workflows` SKILL.md literally. Brand subjects and bodies with the product name; do NOT include any secret keys or PII placeholders that could be mistaken for real values.',
        ].join('\n')
      );
    }

    steps.push(
      [
        'STEP 6 (Triggers): For every workflow you created in STEP 5, add a `novu.trigger(...)` call (or a thin in-app wrapper around it) at the matching call site you identified in STEP 2.',
        '  - Splice the call into a handler that already has a real invocation path: an existing route handler / server action / API route that an existing UI control already submits to, an external webhook (Stripe, Clerk, etc.), an auth callback, or a cron/queue handler.',
        '  - If the natural trigger point is a user action that has no existing handler (e.g. an "Invite teammate" button that does not yet POST anywhere), you MUST also wire the UI control: add the `onClick`/`onSubmit` handler, `<form action={...}>`, or `fetch("/api/...")` call on the existing page that owns that flow. Do not invent a new "test page" or standalone demo route.',
        '  - Never leave a `novu.trigger(...)` call sitting in an orphan API route or server action that nothing in the app invokes. If you cannot find or add a real invocation path for a workflow, skip its trigger and list it under `## Manual triggers needed` in the final report.',
        '  - Always wrap each trigger in `try/catch` so a Novu outage never blocks the host transaction.',
        '  - Use `Edit` to splice the call into the existing handler — do not move handlers into new files.',
      ].join('\n')
    );
  }

  if (goal === 'full') {
    steps.push(
      [
        'STEP 7 (Subscribers): When an auth provider is detected, ensure subscribers are created or updated server-side at sign-up, sign-in, and profile-update hooks.',
        "  - Use the host app's existing user id as the Novu `subscriberId`.",
        '  - Always wrap in `try/catch` for the same reason as triggers.',
      ].join('\n')
    );
  }

  steps.push(
    [
      'FINAL STEP: Write `./novu-wizard-report.md` (see "Final report" below). End the turn after this — do not say goodbye, do not ask questions.',
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

function describeGoalLine(goal: WizardGoal): string {
  if (goal === 'inbox') {
    return 'Inbox-only integration: render the `<Inbox />` component with full personalisation.';
  }
  if (goal === 'workflows') {
    return 'Workflows + triggers integration (no Inbox UI in this run): create workflows and wire `novu.trigger` calls at the matching call sites.';
  }

  return 'Full Novu integration: Inbox + workflows + triggers + subscribers, end-to-end.';
}
