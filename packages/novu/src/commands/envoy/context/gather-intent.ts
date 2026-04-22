import prompts from 'prompts';
import { UserIntent } from '../types';

const QUICK_GOALS = [
  { title: 'In-app inbox notifications', value: 'inbox', description: 'Render the Novu Inbox component' },
  { title: 'Transactional email (welcome, reset, receipts)', value: 'email', description: 'Send via Novu workflows' },
  { title: 'Inbox + email mixed', value: 'mixed', description: 'Use in-app inbox and email channels' },
  { title: 'Something else', value: 'other', description: 'Describe it manually' },
] as const;

export async function gatherIntent(yes: boolean): Promise<UserIntent> {
  if (yes) {
    return {
      summary: 'Default integration: in-app inbox + welcome email workflow',
      goal: 'mixed',
      preferDashboardWorkflows: false,
      notes: '',
    };
  }

  const { goal } = await prompts({
    type: 'select',
    name: 'goal',
    message: 'What do you want Novu to do in this app?',
    choices: QUICK_GOALS.map((choice) => ({
      title: choice.title,
      value: choice.value,
      description: choice.description,
    })),
    initial: 0,
  });

  if (!goal) {
    throw new Error('Envoy needs a goal to proceed.');
  }

  const { workflowMode } = await prompts({
    type: 'select',
    name: 'workflowMode',
    message: 'How would you like to author workflows?',
    choices: [
      { title: 'Code-first with @novu/framework', value: 'framework' },
      { title: 'No-code, via the Novu Dashboard (MCP)', value: 'dashboard' },
    ],
    initial: 0,
  });

  const { notes } = await prompts({
    type: 'text',
    name: 'notes',
    message: 'Any specific requirements? (optional)',
    initial: '',
  });

  return {
    summary: deriveSummary(goal, workflowMode, notes),
    goal: goal as UserIntent['goal'],
    preferDashboardWorkflows: workflowMode === 'dashboard',
    notes: typeof notes === 'string' ? notes : '',
  };
}

function deriveSummary(goal: string, workflowMode: string, notes?: string): string {
  const goalLabel = QUICK_GOALS.find((option) => option.value === goal)?.title ?? goal;
  const modeLabel =
    workflowMode === 'dashboard' ? 'Dashboard workflows (MCP)' : 'Code-first workflows (@novu/framework)';
  const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
  const notesLine = trimmedNotes ? ` Notes: ${trimmedNotes}` : '';

  return `${goalLabel} using ${modeLabel}.${notesLine}`;
}
