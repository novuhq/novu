import type { WizardStore } from '../../ui/store';
import { TrailKind } from '../../ui/store';
import { type OutroData, OutroKind, type WizardSession } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';

const MAX_CHANGE_BULLETS = 6;

export interface BuildOutroStepInput {
  ui: WizardUI;
  store: WizardStore;
  reportPath?: string;
}

export function runBuildOutroStep(input: BuildOutroStepInput): OutroData {
  const session = input.store.session.get();
  const trail = input.store.trail.get();
  const changes = collectChanges(trail);
  const dashboardUrl = session.auth.resolved?.dashboardUrl;

  const data: OutroData = {
    kind: OutroKind.Success,
    message: successHeadline(session),
    changes,
    reportFile: input.reportPath,
    dashboardUrl,
    docsUrl: 'https://docs.novu.co',
  };

  input.ui.setOutroData(data);

  return data;
}

function successHeadline(session: WizardSession): string {
  if (session.goal === 'inbox') return 'Successfully integrated Novu Inbox!';
  if (session.goal === 'workflows') return 'Successfully wired Novu workflows!';

  return 'Successfully integrated Novu!';
}

function collectChanges(
  trail: ReadonlyArray<{ kind: string; toolName?: string; label?: string; inputSummary?: string }>
): string[] {
  const changes: string[] = [];
  const seen = new Set<string>();
  for (const entry of trail) {
    if (entry.kind !== TrailKind.ToolUse) continue;
    const tool = (entry as { toolName?: string }).toolName;
    if (!tool) continue;
    let line: string | null = null;
    if (tool === 'Write' || tool === 'Edit') {
      const file = (entry as { label?: string }).label ?? (entry as { inputSummary?: string }).inputSummary ?? '';
      if (file) line = `${tool === 'Write' ? 'Created' : 'Edited'} ${file}`;
    } else if (tool === 'mcp__novu__create_workflow') {
      const id = (entry as { label?: string }).label ?? '';
      if (id) line = `Created workflow ${id}`;
    } else if (tool === 'Bash') {
      const cmd = (entry as { label?: string }).label ?? '';
      if (
        cmd.startsWith('pnpm add') ||
        cmd.startsWith('npm install') ||
        cmd.startsWith('yarn add') ||
        cmd.startsWith('bun add')
      ) {
        line = `Installed packages: ${cmd}`;
      }
    }
    if (line && !seen.has(line)) {
      seen.add(line);
      changes.push(line);
      if (changes.length >= MAX_CHANGE_BULLETS) break;
    }
  }

  return changes;
}
