import path from 'node:path';

/**
 * Permission gating callback for the Claude Agent SDK.
 *
 * The wizard runs in `permissionMode: 'acceptEdits'` so file edits
 * auto-approve, but every other tool falls through to this hook.
 *
 * Contract:
 * - `allow` lets the SDK proceed with the (possibly mutated) input.
 * - `deny` blocks the call and surfaces `message` back to the model so it
 *   can adjust course instead of silently failing.
 *
 * The hook is the *only* runtime guardrail for tools that aren't in
 * `allowedTools`. Without it, a missing allow-list entry means the call
 * sits in the SDK's prompt queue forever (interactive) or is silently
 * denied (`bypassPermissions` without `allowDangerouslySkipPermissions`).
 *
 * This function is purely about *what* tools are allowed. Concurrent
 * `Write` / `Edit` calls from different subagents to the same file are
 * tolerated: the SDK serialises them at the tool-execution layer and
 * each branch is given its own narrow file domain by the prompt.
 */

/**
 * Bash prefixes the wizard agent is allowed to run.
 *
 * Package installs (`npm install`, `pnpm add`, ...) are deliberately
 * NOT in this list. They run from the wizard CLI's parent process via
 * `pipeline/steps/install-packages.ts`, OUTSIDE the SDK sandbox where
 * macOS `clonefile()` would otherwise block pnpm. The matching
 * `Bash(...)` prefixes are also added to `WIZARD_DISALLOWED_TOOLS` so
 * the agent can't waste minutes retrying inside the sandbox.
 * 'npm install',
 * 'npm i ',
 * 'npm i\n',
 * 'pnpm install',
 * 'pnpm add',
 * 'yarn add',
 * 'yarn install',
 * 'bun add',
 * 'bun install',
 *
 * Validation commands (lint, typecheck, tests, formatters) are also
 * NOT here — see {@link VALIDATION_PATTERNS}. The wizard runs ONE
 * lint + ONE typecheck pass from `pipeline/steps/validate.ts` after
 * the parallel fan-out completes, so there's no reason for an agent
 * to retry them inside its turn.
 * 'tsc',
 * 'pnpm tsc',
 * 'npm run typecheck',
 * 'pnpm typecheck',
 * 'yarn typecheck',
 * 'pnpm run lint',
 * 'npm run lint',
 * 'yarn lint',
 * 'eslint',
 * 'prettier',
 * 'biome',
 */
const SAFE_BASH_PREFIXES: ReadonlyArray<string> = [
  // Read-only diagnostics / build verification. Build is sometimes
  // required by code-first workflow setups (e.g. compiling email
  // templates) so we keep it allowed.
  'npm run build',
  'pnpm run build',
  'pnpm build',
  'yarn build',
  'bun run build',
];

const DANGEROUS_BASH_PATTERNS = /(?:^|[\s|;&])(?:rm|sudo|curl|wget|chmod|chown|mv|kill|killall)\b/;

/**
 * Validation commands — `tsc`, `eslint`, `prettier`, `biome`, `vitest`,
 * `jest`, `mocha`, plus the package-manager-script aliases (`pnpm lint`,
 * `pnpm check-types`, `pnpm typecheck`, `pnpm test`, …).
 *
 * The wizard CLI runs a single authoritative validation pass after the
 * parallel fan-out completes (`pipeline/steps/validate.ts`), so there's
 * no reason for any subagent to retry these commands during its turn.
 * Blocking them here means the slowest branch (workflows, today) can't
 * burn 30+ seconds re-running `pnpm lint` against the whole monorepo
 * mid-edit.
 */
const VALIDATION_PATTERNS =
  /\b(?:tsc|eslint|prettier|biome|vitest|jest|mocha|pnpm(?:\s+(?:run\s+)?(?:lint|typecheck|check-types|test))|npm\s+run\s+(?:lint|typecheck|check-types|test)|yarn\s+(?:lint|typecheck|test)|bun\s+(?:lint|test|run\s+(?:lint|typecheck|test)))\b/;

const ENV_FILE_PREFIXES = ['.env'];

export type CanUseToolDecision =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string };

/**
 * Inspect a single tool invocation. Pure function — easy to unit-test
 * without spinning up the SDK.
 */
export function novuCanUseTool(toolName: string, input: Record<string, unknown>): CanUseToolDecision {
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

  /**
   * `Task` / `Agent` are the parallel-fan-out entrypoint (the SDK reports
   * the same dispatch tool under either name depending on the preset).
   * Allow both everywhere so the main agent can dispatch the three wizard
   * subagents.
   */
  if (toolName === 'Task' || toolName === 'Agent') {
    return { behavior: 'allow', updatedInput: input };
  }

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
    if (VALIDATION_PATTERNS.test(command)) {
      return {
        behavior: 'deny',
        message:
          'Validation commands (lint, typecheck, tests, formatters) are blocked inside the wizard. ' +
          'The wizard CLI runs ONE lint + ONE typecheck pass after every subagent completes and surfaces ' +
          'the results in the report — do not retry them here.',
      };
    }
    if (SAFE_BASH_PREFIXES.some((prefix) => command.startsWith(prefix))) {
      return { behavior: 'allow', updatedInput: input };
    }

    return {
      behavior: 'deny',
      message:
        'Bash command not allowed. Package installs (`npm install`, `pnpm add`, …) run from the wizard CLI ' +
        'before this turn — do NOT retry them here. Validation (lint/typecheck/test) is also handled by the ' +
        'wizard CLI after fan-out. Only `build` commands are permitted.',
    };
  }

  // Anything else (subagents, Task, NotebookEdit, web search, etc.) — allow.
  // The disallowedTools list still blocks the truly dangerous ones.
  return { behavior: 'allow', updatedInput: input };
}
