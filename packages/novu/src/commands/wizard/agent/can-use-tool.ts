import path from 'node:path';

/**
 * Permission gating callback for the Claude Agent SDK.
 * The wizard runs in `permissionMode: 'acceptEdits'` so
 * file edits auto-approve, but every other tool falls through to this hook.
 *
 * Contract:
 * - `allow` lets the SDK proceed with the (possibly mutated) input.
 * - `deny` blocks the call and surfaces `message` back to the model so it can
 *   adjust course instead of silently failing.
 *
 * The hook is the *only* runtime guardrail for tools that aren't in
 * `allowedTools`. Without it, a missing allow-list entry means the call sits
 * in the SDK's prompt queue forever (interactive) or is silently denied
 * (`bypassPermissions` without `allowDangerouslySkipPermissions`).
 */

const SAFE_BASH_PREFIXES: ReadonlyArray<string> = [
  // Package installs — match what `WIZARD_AUTO_ALLOWED_TOOLS` already auto-approves.
  'npm install',
  'npm i ',
  'npm i\n',
  'pnpm install',
  'pnpm add',
  'yarn add',
  'yarn install',
  'bun add',
  'bun install',
  // Read-only diagnostics / build verification.
  'npm run build',
  'pnpm run build',
  'pnpm build',
  'yarn build',
  'bun run build',
  'tsc',
  'pnpm tsc',
  'npm run typecheck',
  'pnpm typecheck',
  'yarn typecheck',
  'pnpm run lint',
  'npm run lint',
  'yarn lint',
  'eslint',
  'prettier',
];

const DANGEROUS_BASH_PATTERNS = /(?:^|[\s|;&])(?:rm|sudo|curl|wget|chmod|chown|mv|kill|killall)\b/;

const ENV_FILE_PREFIXES = ['.env'];

export type CanUseToolDecision =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string };

/**
 * Inspect a single tool invocation. Pure function — easy to unit-test
 * without spinning up the SDK.
 */
export function novuCanUseTool(toolName: string, input: Record<string, unknown>): CanUseToolDecision {
  // Block direct reads/writes of .env files. The user's project might house
  // long-lived secrets there — the agent should call out the variable names
  // instead and let the user paste real values themselves.
  if (toolName === 'Read' || toolName === 'Write' || toolName === 'Edit') {
    const filePath = typeof input.file_path === 'string' ? input.file_path : '';
    const basename = path.basename(filePath);
    if (ENV_FILE_PREFIXES.some((prefix) => basename.startsWith(prefix))) {
      return {
        behavior: 'deny',
        message:
          `Direct ${toolName} of ${basename} is not allowed. Tell the user which env vars to set ` +
          `(e.g. NOVU_SECRET_KEY, NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) and let them paste real values.`,
      };
    }

    return { behavior: 'allow', updatedInput: input };
  }

  // Glob / Grep are always safe.
  if (toolName === 'Glob' || toolName === 'Grep') {
    return { behavior: 'allow', updatedInput: input };
  }

  // TodoWrite / Skill / WebFetch / ListMcpResourcesTool are auto-approved
  // upstream via `allowedTools`. Allow them again here as a defence-in-depth.
  if (
    toolName === 'TodoWrite' ||
    toolName === 'Skill' ||
    toolName === 'WebFetch' ||
    toolName === 'ListMcpResourcesTool'
  ) {
    return { behavior: 'allow', updatedInput: input };
  }

  // MCP tools: any `mcp__novu__*` is part of the contract — auto-approve.
  if (toolName.startsWith('mcp__novu__')) {
    return { behavior: 'allow', updatedInput: input };
  }

  if (toolName === 'Bash') {
    const command = (typeof input.command === 'string' ? input.command : '').trim();
    if (!command) {
      return { behavior: 'deny', message: 'Bash command is empty.' };
    }
    if (DANGEROUS_BASH_PATTERNS.test(command)) {
      return {
        behavior: 'deny',
        message: 'Bash command not allowed. Destructive commands (rm/sudo/curl/wget/chmod/chown/mv/kill) are blocked.',
      };
    }
    if (SAFE_BASH_PREFIXES.some((prefix) => command.startsWith(prefix))) {
      return { behavior: 'allow', updatedInput: input };
    }

    return {
      behavior: 'deny',
      message:
        'Bash command not allowed. Only package install (npm/pnpm/yarn/bun add|install), build, typecheck, ' +
        'lint, and formatting commands are permitted.',
    };
  }

  // Anything else (subagents, Task, NotebookEdit, web search, etc.) — allow.
  // The disallowedTools list still blocks the truly dangerous ones.
  return { behavior: 'allow', updatedInput: input };
}
