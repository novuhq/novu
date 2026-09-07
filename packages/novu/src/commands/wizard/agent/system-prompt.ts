import { getNovuWizardCommandments } from './commandments';

/**
 * The system prompt now carries *only* commandments (negative guardrails).
 * All operational guidance — STEP-numbered task list, project context,
 * skill paths — moved to the autonomous user message in
 * `agent/build-user-prompt.ts`.
 *
 * Why the split:
 * - The commandments are byte-identical across every wizard session, which
 *   makes them eligible for Anthropic's prompt cache when paired with
 *   `excludeDynamicSections: true` on the `claude_code` preset.
 * - The user message can vary per session (project context, installed skill
 *   paths, goal) without invalidating the cache prefix.
 * - Numbered STEP instructions belong in the user message because
 *   experience shows the agent ships materially more code edits when the
 *   "what to do now" lives in the conversation rather than the system block.
 */
export function buildSystemPrompt(): string {
  return getNovuWizardCommandments();
}
