import fs from 'node:fs';
import path from 'node:path';
import type { ProjectContext, ResolvedAuth } from '../types';
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
  mcpInstalled?: McpInstallResult | null;
  /**
   * Optional path the agent already wrote `novu-wizard-report.md` to. When
   * present, this builder appends the wizard-side summary block to that file
   * (keeping the agent's body intact). Otherwise it writes a fresh file.
   */
  agentReportPath?: string;
}

export const REPORT_FILENAME = 'novu-wizard-report.md';

export function buildAndWriteReport(input: BuildReportInput): string {
  const target = input.agentReportPath ?? path.join(input.cwd, REPORT_FILENAME);
  const filesChanged = collectFilesChanged(input.trail);
  const workflowsCreated = collectWorkflowsCreated(input.trail);
  const summary = renderSummarySection(input, filesChanged, workflowsCreated);

  if (input.agentReportPath && fs.existsSync(target)) {
    const existing = fs.readFileSync(target, 'utf8');
    if (!existing.includes('## Wizard run summary')) {
      fs.writeFileSync(target, `${existing.trimEnd()}\n\n${summary}\n`, 'utf8');
    }

    return target;
  }

  fs.writeFileSync(target, `${renderHeader(input)}\n\n${summary}\n`, 'utf8');

  return target;
}

function renderHeader(input: BuildReportInput): string {
  return [
    '# Novu Wizard report',
    '',
    `_Generated ${new Date().toISOString()}_`,
    '',
    `**Goal:** ${describeGoal(input.goal)}`,
  ].join('\n');
}

function renderSummarySection(
  input: BuildReportInput,
  filesChanged: { created: string[]; edited: string[] },
  workflowsCreated: string[]
): string {
  const lines: string[] = [
    '## Wizard run summary',
    '',
    '### Project context',
    `- Working directory: \`${input.project.cwd}\``,
    `- Framework: ${input.project.framework}`,
    `- Package manager: ${input.project.packageManager}`,
    `- TypeScript: ${input.project.hasTypeScript ? 'yes' : 'no'}`,
    `- Detected Novu packages: ${input.project.installedNovuPackages.length ? input.project.installedNovuPackages.join(', ') : 'none'}`,
    '',
    '### Skills installed',
    `- ${input.installedSkillsCount} Novu skill files installed across detected editors`,
    '',
    '### Files changed',
    ...renderFileLists(filesChanged),
    '',
    '### Workflows created',
    workflowsCreated.length === 0 ? '- (none)' : workflowsCreated.map((id) => `- \`${id}\``).join('\n'),
    '',
    '### MCP server installed',
    input.mcpInstalled ? `- ${input.mcpInstalled.clientLabel} → \`${input.mcpInstalled.configPath}\`` : '- (skipped)',
    '',
    '### Next steps',
    `- Set \`NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER\` in your env (find it in the dashboard).`,
    `- Visit ${input.auth.dashboardUrl} to monitor activity.`,
    `- For docs: https://docs.novu.co`,
  ];

  return lines.join('\n');
}

function renderFileLists(filesChanged: { created: string[]; edited: string[] }): string[] {
  const out: string[] = [];
  if (filesChanged.created.length === 0 && filesChanged.edited.length === 0) {
    out.push('- (none)');

    return out;
  }
  if (filesChanged.created.length > 0) {
    out.push('**Created**');
    for (const file of filesChanged.created) out.push(`- \`${file}\``);
  }
  if (filesChanged.edited.length > 0) {
    if (out.length > 0) out.push('');
    out.push('**Edited**');
    for (const file of filesChanged.edited) out.push(`- \`${file}\``);
  }

  return out;
}

function collectFilesChanged(trail: TrailEntry[]): { created: string[]; edited: string[] } {
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

  return {
    created: Array.from(created).filter(Boolean).sort(),
    edited: Array.from(edited).filter(Boolean).sort(),
  };
}

function collectWorkflowsCreated(trail: TrailEntry[]): string[] {
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

function describeGoal(goal: WizardGoal): string {
  if (goal === 'inbox') return 'Inbox-only integration';
  if (goal === 'workflows') return 'Workflows + triggers integration';

  return 'Full Novu integration (Inbox + workflows + triggers + subscribers)';
}
