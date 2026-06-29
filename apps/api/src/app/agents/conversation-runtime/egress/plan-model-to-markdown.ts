import type { PlanModel, PlanTaskStatus } from 'chat';
import { PLAN_THINKING_TASK_ID, type PlanPhase, planTitleEmojiForPhase, planTitleForPhase } from './plan-phase';

export function renderPlanModelAsMarkdown(plan: PlanModel, phase: PlanPhase): string {
  const title = planTitleForPhase(phase);
  const header = `${planTitleEmojiForPhase(phase)} **${escapeMarkdownInline(title)}**`;

  const taskLines = plan.tasks
    .filter((task) => task.id !== PLAN_THINKING_TASK_ID)
    .map((task) => `${planTaskStatusEmoji(task.status)} ${formatTaskTitle(task.title)}`);

  if (taskLines.length === 0) {
    return header;
  }

  return `${header}\n\n${taskLines.join('\n')}`;
}

function formatTaskTitle(title: string): string {
  const escaped = title.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

  return `\`${escaped}\``;
}

function escapeMarkdownInline(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/([*_`[\]])/g, '\\$1');
}

function planTaskStatusEmoji(status: PlanTaskStatus): string {
  switch (status) {
    case 'complete':
      return '✅';
    case 'in_progress':
      return '🔄';
    case 'error':
      return '❌';
    default:
      return '▫️';
  }
}
