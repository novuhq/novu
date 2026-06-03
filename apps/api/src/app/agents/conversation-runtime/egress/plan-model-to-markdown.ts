import type { PlanModel, PlanTaskStatus } from 'chat';

/**
 * Markdown plan rendering for Telegram and Teams (in-place edit via markdown fallback).
 * Uses common markdown (**bold**, `code`) converted to Telegram MarkdownV2 by chat-sdk.
 */
export function renderPlanModelAsMarkdown(plan: PlanModel): string {
  const title = plan.title || 'Plan';
  const sections: string[] = [];

  sections.push(`${planTitleEmoji(title)} **${escapeMarkdownInline(title)}**`);

  const taskLines = plan.tasks
    .filter((task) => task.id !== '__thinking__')
    .map((task) => `${planTaskStatusEmoji(task.status)} ${formatTaskTitle(task.title)}`);

  if (taskLines.length > 0) {
    sections.push(taskLines.join('\n'));
  }

  const markdown = sections.join('\n\n').trim();

  if (markdown) {
    return markdown;
  }

  return '📋 **Plan**';
}

/** Markdown body for plan post/edit; never empty (Telegram rejects blank messages). */
export function buildPlanDeliveryMarkdown(plan: PlanModel): string {
  return renderPlanModelAsMarkdown(plan);
}

function formatTaskTitle(title: string): string {
  const escaped = title.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

  return `\`${escaped}\``;
}

function escapeMarkdownInline(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/([*_`[\]])/g, '\\$1');
}

function planTitleEmoji(title: string): string {
  const normalized = title.trim().toLowerCase();

  if (normalized.includes('wrong') || normalized.includes('fail') || normalized.includes('error')) {
    return '❌';
  }

  if (normalized.includes('finished') || normalized.startsWith('done')) {
    return '✅';
  }

  if (normalized.includes('approval') || normalized.includes('waiting')) {
    return '⏳';
  }

  if (normalized.includes('denied')) {
    return '🚫';
  }

  if (normalized.includes('approved') || normalized.includes('resuming')) {
    return '✅';
  }

  if (normalized.includes('thinking')) {
    return '🧠';
  }

  return '📋';
}

function planTaskStatusEmoji(status: PlanTaskStatus | string): string {
  switch (status) {
    case 'complete':
    case 'completed':
      return '✅';
    case 'in_progress':
    case 'running':
      return '🔄';
    case 'error':
    case 'fail':
    case 'failed':
      return '❌';
    case 'awaiting-approval':
    case 'pending':
      return '⏳';
    default:
      return '▫️';
  }
}
