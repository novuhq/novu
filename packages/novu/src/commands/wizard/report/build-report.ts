import fs from 'node:fs';
import path from 'node:path';
import { summariseTopology } from '../context/summarise-topology';
import type { InstallPackagesResult } from '../pipeline/steps/install-packages';
import type { ValidationLoopReason } from '../pipeline/steps/run-agent';
import type { ValidationResult } from '../pipeline/steps/validate';
import type { AgentRunResult, BranchResult, ProjectContext, ResolvedAuth, SubagentBranch } from '../types';
import type { TrailEntry } from '../ui/store';
import { TrailKind } from '../ui/store';
import type { McpInstallResult, WizardGoal } from '../ui/wizard-session';

export interface BuildReportInput {
  cwd: string;
  goal: WizardGoal;
  project: ProjectContext;
  auth: ResolvedAuth;
  trail: TrailEntry[];
  installedSkillsCount: number;
  /**
   * Every MCP client the wizard wrote a Novu MCP server config into. The
   * runner fans out across each detected agent host, so this array can
   * have 0–N entries — empty when the user opted out or no editor was
   * detected, one when the legacy interactive picker is used, multiple
   * when several hosts (Cursor + Claude Code + VS Code, …) were resolved.
   */
  mcpInstalled?: McpInstallResult[] | null;
  /**
   * Aggregate of every branch's structured JSON result, parsed by
   * `runAgentStep` from the main agent's final assistant message. When a
   * branch is missing here we fall back to the trail-derived sections so
   * the report still ships even if the agent botched its aggregate.
   */
  agentResult?: AgentRunResult | null;
  /**
   * Per-workspace install outcome from `runInstallPackagesStep`. Drives
   * the "Packages installed" section and the manual `pnpm install`
   * reminders in "Next steps".
   */
  installResult?: InstallPackagesResult | null;
  /**
   * Per-workspace lint + typecheck outcomes from the agent's fix loop.
   * Drives the "Validation" section. `null` when validation was skipped
   * entirely (no application workspaces); empty array when validation
   * ran but no workspace had a script to invoke.
   */
  validation?: ValidationResult[] | null;
  /**
   * How many validate attempts the fix loop made. `>1` means at least
   * one fix turn ran — the report calls that out so the user knows the
   * wizard auto-fixed something.
   */
  validationAttempts?: number;
  /**
   * Why the fix loop terminated. `'budget'` triggers a "remaining issues
   * need manual follow-up" header; `'clean'` plus `validationAttempts > 1`
   * surfaces a friendly "auto-fixed after N attempts" line.
   */
  validationReason?: ValidationLoopReason;
}

export const REPORT_FILENAME = 'novu-wizard-report.md';

/**
 * Builds and writes `novu-wizard-report.md`.
 *
 * The wizard agent does NOT write this file itself any more — it is built
 * deterministically from the tool-call trail (every `Write`/`Edit`/MCP
 * call collected by the runner) plus the per-branch JSON aggregate the
 * main agent emitted in its final message. This avoids an extra agent
 * turn at the end of the run and gives the wizard authoritative control
 * over what the user sees.
 *
 * The file is written to `<cwd>/novu-wizard-report.md` and the absolute
 * path is returned so the runner can surface it on the outro screen.
 */
export function buildAndWriteReport(input: BuildReportInput): string {
  const target = path.join(input.cwd, REPORT_FILENAME);
  const body = buildReport(input);
  fs.writeFileSync(target, `${body}\n`, 'utf8');

  return target;
}

/**
 * Pure builder: returns the report markdown without writing it. Exposed
 * for unit tests and for callers that want to render the report in
 * memory (e.g. dry-run mode in the future).
 */
export function buildReport(input: BuildReportInput): string {
  const trailFiles = collectFilesChangedFromTrail(input.trail);
  const trailWorkflowIds = collectWorkflowIdsFromTrail(input.trail);
  const branches = input.agentResult?.branches ?? {};
  const branchParseFailures = input.agentResult?.branchParseFailures ?? [];

  const sections: string[] = [];
  sections.push(renderHeader(input));
  sections.push(renderGoalSection(input.goal, input.installResult ?? null));
  sections.push(renderProjectContextSection(input.project, input.auth));
  sections.push(renderPackagesInstalledSection(input.installResult ?? null));
  sections.push(renderFilesChangedSection(branches, trailFiles));
  sections.push(renderWorkflowsCreatedSection(branches, trailWorkflowIds));
  sections.push(renderTriggerSitesSection(branches, input.trail));
  sections.push(renderSubscriberSyncSection(branches));
  sections.push(renderManualTriggersSection(branches));
  sections.push(renderSkillsAndMcpSection(input));
  sections.push(
    renderValidationSection(
      input.validation ?? null,
      input.validationAttempts ?? 0,
      input.validationReason ?? 'no-fix-loop'
    )
  );
  sections.push(renderNotesSection(branches, branchParseFailures));
  sections.push(renderNextStepsSection(input));

  return sections.filter((section) => section.length > 0).join('\n\n');
}

function renderHeader(_input: BuildReportInput): string {
  return [`# Novu Wizard report`, '', `_Generated ${new Date().toISOString()}_`].join('\n');
}

function renderGoalSection(goal: WizardGoal, installResult: InstallPackagesResult | null): string {
  const lines: string[] = ['## Goal', '', `- ${describeGoal(goal)}`];
  if (installResult && installResult.effectiveGoal !== installResult.requestedGoal) {
    lines.push(
      `- _Rebalanced from \`${installResult.requestedGoal}\` → \`${installResult.effectiveGoal}\` — ${installResult.rebalanceReason}_`
    );
  }

  return lines.join('\n');
}

function renderPackagesInstalledSection(installResult: InstallPackagesResult | null): string {
  if (!installResult) return '';

  const lines: string[] = ['## Packages installed', ''];
  lines.push(`- Package manager: \`${installResult.packageManager.label}\``);
  lines.push(`- Detected topology: ${describeTopologyForReport(installResult)}`);

  for (const target of installResult.targets) {
    const label = target.workspaceName ?? target.cwd;
    const summary = formatTargetInstallSummary(target);
    const frameworkSuffix = target.framework !== 'unknown' ? `, ${target.framework}` : '';
    lines.push(`- \`${label}\` (${target.role}${frameworkSuffix}): ${summary}`);
    if (target.errorLogPath) {
      lines.push(`  - Install error log: \`${target.errorLogPath}\``);
    }
  }

  if (installResult.skippedWorkspaces.length > 0) {
    lines.push('');
    lines.push('**Skipped workspaces (libraries):**');
    for (const ws of installResult.skippedWorkspaces) {
      const label = ws.workspaceName ?? ws.cwd;
      lines.push(`- \`${label}\` — ${ws.reason}`);
    }
  }

  return lines.join('\n');
}

function describeTopologyForReport(installResult: InstallPackagesResult): string {
  const counts: string[] = [];
  if (installResult.topology.hasFullstack) {
    counts.push(countTopology(installResult, 'fullstack'));
  }
  if (installResult.topology.hasWeb) counts.push(countTopology(installResult, 'web'));
  if (installResult.topology.hasApi) counts.push(countTopology(installResult, 'api'));
  if (counts.length === 0) return 'single workspace';

  return counts.join(' + ');
}

function countTopology(installResult: InstallPackagesResult, role: 'web' | 'api' | 'fullstack'): string {
  const n = installResult.targets.filter((t) => t.role === role).length;
  if (n <= 1) return `1 ${role}`;

  return `${n} ${role}`;
}

function formatTargetInstallSummary(target: InstallPackagesResult['targets'][number]): string {
  if (target.packagesInstalled.length > 0) {
    return `installed ${target.packagesInstalled.map((p) => `\`${p}\``).join(', ')}`;
  }
  if (target.packagesEditedDirectly.length > 0) {
    return `declared ${target.packagesEditedDirectly.map((p) => `\`${p}\``).join(', ')} in package.json — install failed`;
  }
  if (target.packagesRequested.length === 0) {
    return 'required packages already present';
  }

  return `(no changes — packages: ${target.packagesRequested.map((p) => `\`${p}\``).join(', ')})`;
}

function renderProjectContextSection(project: ProjectContext, auth: ResolvedAuth): string {
  return [
    '## Project context',
    '',
    `- Working directory: \`${project.cwd}\``,
    `- Package manager: \`${project.packageManager}\``,
    `- TypeScript: ${project.hasTypeScript ? 'yes' : 'no'}`,
    `- Workspaces: ${summariseTopology(project.topology)}`,
    `- Novu environment: ${auth.environmentName ?? auth.environmentId} (${auth.region})`,
  ].join('\n');
}

function renderFilesChangedSection(
  branches: Partial<Record<SubagentBranch, BranchResult>>,
  trailFiles: { created: string[]; edited: string[] }
): string {
  const created = new Set<string>(trailFiles.created);
  const edited = new Set<string>(trailFiles.edited);
  for (const branch of Object.values(branches)) {
    if (!branch) continue;
    for (const entry of branch.filesChanged) {
      if (entry.kind === 'created') created.add(entry.path);
      else edited.add(entry.path);
    }
  }
  for (const path of created) edited.delete(path);

  const createdSorted = Array.from(created).sort();
  const editedSorted = Array.from(edited).sort();

  if (createdSorted.length === 0 && editedSorted.length === 0) {
    return ['## Files changed', '', '- (none)'].join('\n');
  }

  const lines: string[] = ['## Files changed', ''];
  if (createdSorted.length > 0) {
    lines.push('**Created**');
    lines.push('');
    for (const file of createdSorted) lines.push(`- \`${file}\``);
  }
  if (editedSorted.length > 0) {
    if (createdSorted.length > 0) lines.push('');
    lines.push('**Edited**');
    lines.push('');
    for (const file of editedSorted) lines.push(`- \`${file}\``);
  }

  return lines.join('\n');
}

function renderWorkflowsCreatedSection(
  branches: Partial<Record<SubagentBranch, BranchResult>>,
  trailWorkflowIds: string[]
): string {
  const fromBranches = branches.workflows?.workflowsCreated ?? [];
  const lines: string[] = ['## Workflows created', ''];

  if (fromBranches.length > 0) {
    for (const wf of fromBranches) {
      const triggerLabel = wf.trigger ? ` — trigger \`${wf.trigger}\`` : '';
      const kindLabel = wf.kind === 'code-first' ? ' (code-first)' : ' (no-code)';
      lines.push(`- \`${wf.id}\`${triggerLabel}${kindLabel}`);
    }
    const branchIds = new Set(fromBranches.map((wf) => wf.id));
    const trailOnly = trailWorkflowIds.filter((id) => !branchIds.has(id));
    if (trailOnly.length > 0) {
      lines.push('');
      lines.push('**MCP-created (not surfaced in subagent JSON):**');
      for (const id of trailOnly) lines.push(`- \`${id}\``);
    }

    return lines.join('\n');
  }

  if (trailWorkflowIds.length > 0) {
    for (const id of trailWorkflowIds) lines.push(`- \`${id}\``);

    return lines.join('\n');
  }

  lines.push('- (none)');

  return lines.join('\n');
}

function renderTriggerSitesSection(
  branches: Partial<Record<SubagentBranch, BranchResult>>,
  trail: TrailEntry[]
): string {
  const triggers = branches.workflows?.triggersWired ?? [];
  const lines: string[] = ['## Trigger sites wired', ''];
  if (triggers.length === 0) {
    const triggerCalls = collectTriggerEditsFromTrail(trail);
    if (triggerCalls.length === 0) {
      lines.push('- (none)');

      return lines.join('\n');
    }
    for (const file of triggerCalls) lines.push(`- \`${file}\` (wired via \`novu.trigger\`)`);

    return lines.join('\n');
  }

  for (const entry of triggers) {
    const ui = entry.uiFile ? ` invoked by \`${entry.uiFile}\`` : '';
    lines.push(`- \`${entry.workflowId}\` — \`${entry.serverFile}\`${ui}`);
  }

  return lines.join('\n');
}

function renderSubscriberSyncSection(branches: Partial<Record<SubagentBranch, BranchResult>>): string {
  const points = branches.subscribers?.subscriberSyncPoints ?? [];
  const lines: string[] = ['## Subscriber sync points', ''];
  if (points.length === 0) {
    lines.push('- (none)');

    return lines.join('\n');
  }
  for (const point of points) lines.push(`- \`${point.file}\` — \`${point.hook}\``);

  return lines.join('\n');
}

function renderManualTriggersSection(branches: Partial<Record<SubagentBranch, BranchResult>>): string {
  const manual = branches.workflows?.manualTriggersNeeded ?? [];
  if (manual.length === 0) return '';

  const lines: string[] = ['## Manual triggers needed', ''];
  for (const entry of manual) lines.push(`- \`${entry.workflowId}\` — ${entry.reason || '(reason not provided)'}`);

  return lines.join('\n');
}

/**
 * Render the "Validation" section. Surfaces the final result of the
 * agent's validate ↔ fix loop (see `pipeline/steps/run-agent.ts` +
 * `pipeline/steps/validate.ts`).
 *
 * - `validation === null` → fix loop never ran. Section is omitted.
 * - Empty array → workspaces had no `lint` / `typecheck` scripts.
 * - All exit 0 → "Passed" block; if the loop took >1 attempt to get
 *   here, prepend an "auto-fixed after N attempts" note.
 * - Any non-zero → "Failures" subsection with stderr tails. If the loop
 *   bailed because it ran out of budget, prepend a header explaining
 *   that the remaining issues need manual follow-up.
 */
function renderValidationSection(
  validation: ValidationResult[] | null,
  validationAttempts: number,
  validationReason: ValidationLoopReason
): string {
  if (validation === null) return '';

  const lines: string[] = ['## Validation', ''];

  if (validation.length === 0) {
    lines.push('- No `lint` / `typecheck` scripts detected in the touched workspaces — skipped.');

    return lines.join('\n');
  }

  const failures = validation.filter((r) => r.exitCode !== 0);
  const successes = validation.filter((r) => r.exitCode === 0);

  if (validationReason === 'budget' && failures.length > 0) {
    lines.push(
      `_Validation budget exhausted after ${validationAttempts} fix attempt${validationAttempts === 1 ? '' : 's'}; the remaining issues below need manual follow-up._`
    );
    lines.push('');
  } else if (validationReason === 'clean' && failures.length === 0 && validationAttempts > 1) {
    const fixTurns = validationAttempts - 1;
    lines.push(`_All checks pass after ${fixTurns} auto-fix turn${fixTurns === 1 ? '' : 's'}._`);
    lines.push('');
  }

  if (failures.length > 0) {
    lines.push(`**Failures (${failures.length})** — run these locally to inspect the full output:`);
    lines.push('');
    for (const failure of failures) {
      const exitDescriptor = failure.timedOut ? `timed out` : `exit ${failure.exitCode}`;
      lines.push(
        `- \`${failure.workspace}\` · ${failure.kind} · \`${failure.command}\` · ${exitDescriptor} (${formatMs(failure.durationMs)})`
      );
      const tail = failure.stderrTail.trim() || failure.stdoutTail.trim();
      if (tail) {
        lines.push('');
        lines.push('  ```');
        for (const line of tail.split(/\r?\n/).slice(-12)) {
          lines.push(`  ${line}`);
        }
        lines.push('  ```');
      }
    }
    if (successes.length > 0) lines.push('');
  }

  if (successes.length > 0) {
    lines.push(`**Passed (${successes.length})**`);
    lines.push('');
    for (const success of successes) {
      lines.push(
        `- \`${success.workspace}\` · ${success.kind} · \`${success.command}\` (${formatMs(success.durationMs)})`
      );
    }
  }

  return lines.join('\n');
}

function formatMs(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);

  return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
}

function renderSkillsAndMcpSection(input: BuildReportInput): string {
  const lines: string[] = ['## Wizard ops', ''];
  lines.push(`- Novu skills installed: ${input.installedSkillsCount}`);
  const installed = input.mcpInstalled ?? [];
  if (installed.length === 0) {
    lines.push('- Novu MCP server installed: (skipped)');
  } else if (installed.length === 1) {
    const only = installed[0];
    lines.push(`- Novu MCP server installed: ${only.clientLabel} → \`${only.configPath}\``);
  } else {
    lines.push(`- Novu MCP server installed in ${installed.length} editors:`);
    for (const entry of installed) {
      lines.push(`  - ${entry.clientLabel} → \`${entry.configPath}\``);
    }
  }

  return lines.join('\n');
}

function renderNotesSection(
  branches: Partial<Record<SubagentBranch, BranchResult>>,
  branchParseFailures: SubagentBranch[]
): string {
  const allNotes: { branch: SubagentBranch; note: string }[] = [];
  for (const [branchKey, value] of Object.entries(branches)) {
    if (!value) continue;
    for (const note of value.notes) allNotes.push({ branch: branchKey as SubagentBranch, note });
  }
  if (allNotes.length === 0 && branchParseFailures.length === 0) return '';

  const lines: string[] = ['## Notes', ''];
  for (const failure of branchParseFailures) {
    lines.push(
      `- _${failure}_ — could not parse the subagent's structured result; report sections for this branch ` +
        'were derived from the trail only.'
    );
  }
  for (const entry of allNotes) lines.push(`- _${entry.branch}_ — ${entry.note}`);

  return lines.join('\n');
}

function renderNextStepsSection(input: BuildReportInput): string {
  const lines: string[] = ['## Next steps', ''];

  const editedTargets = input.installResult?.targets.filter((t) => t.packagesEditedDirectly.length > 0) ?? [];
  if (editedTargets.length > 0) {
    const family = input.installResult?.packageManager.family ?? 'pnpm';
    lines.push(
      `- Run \`${family} install\` to fetch packages declared directly in \`package.json\` (the wizard could not run the install in the sandbox).`
    );
    for (const target of editedTargets) {
      const label = target.workspaceName ?? target.cwd;
      lines.push(`  - \`${label}\`: ${target.packagesEditedDirectly.map((p) => `\`${p}\``).join(', ')}`);
      if (target.errorLogPath) {
        lines.push(`    - Inspect the install error log at \`${target.errorLogPath}\``);
      }
    }
  }

  lines.push(`- Set \`NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER\` in your env (find it in the dashboard).`);
  lines.push(`- Visit ${input.auth.dashboardUrl} to monitor activity.`);
  lines.push(`- Docs: https://docs.novu.co`);

  return lines.join('\n');
}

function collectFilesChangedFromTrail(trail: TrailEntry[]): { created: string[]; edited: string[] } {
  const created = new Set<string>();
  const edited = new Set<string>();
  for (const entry of trail) {
    if (entry.kind !== TrailKind.ToolUse) continue;
    if (entry.toolName === 'Write') {
      created.add(entry.label || entry.inputSummary);
    } else if (entry.toolName === 'Edit') {
      edited.add(entry.label || entry.inputSummary);
    }
  }
  for (const path of created) edited.delete(path);

  return {
    created: Array.from(created).filter(Boolean).sort(),
    edited: Array.from(edited).filter(Boolean).sort(),
  };
}

function collectWorkflowIdsFromTrail(trail: TrailEntry[]): string[] {
  const ids = new Set<string>();
  for (const entry of trail) {
    if (entry.kind !== TrailKind.ToolUse) continue;
    if (entry.toolName === 'mcp__novu__create_workflow' || entry.toolName === 'mcp__novu__update_workflow') {
      const id = entry.label || entry.inputSummary;
      if (id) ids.add(id);
    }
  }

  return Array.from(ids).sort();
}

/**
 * Best-effort fallback: when the workflow subagent did not include a
 * `triggersWired` array (or its JSON failed to parse), find every Edit /
 * Write call whose patch contains a literal `novu.trigger(` insertion so
 * the report still surfaces the wired files.
 */
function collectTriggerEditsFromTrail(trail: TrailEntry[]): string[] {
  const out = new Set<string>();
  for (const entry of trail) {
    if (entry.kind !== TrailKind.Diff) continue;
    if (!entry.patch.includes('novu.trigger(')) continue;
    out.add(entry.file);
  }

  return Array.from(out).sort();
}

function describeGoal(goal: WizardGoal): string {
  if (goal === 'inbox') return 'Inbox-only integration';
  if (goal === 'workflows') return 'Workflows + triggers integration';

  return 'Full Novu integration (Inbox + workflows + triggers + subscribers)';
}
