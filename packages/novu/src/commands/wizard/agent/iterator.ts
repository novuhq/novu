import chalk from 'chalk';
import { CloudRegionEnum } from '../../dev/enums';
import type { InstallPackagesResult } from '../pipeline/steps/install-packages';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth, WizardCommandOptions } from '../types';
import type { WizardGoal } from '../ui/wizard-session';
import { buildUserPrompt } from './build-user-prompt';
import { novuCanUseTool } from './can-use-tool';
import { createWizardStopHook, type WizardStopHookState } from './stop-hook';
import { buildSystemPrompt } from './system-prompt';

export interface CreateAgentIteratorInput {
  options: WizardCommandOptions;
  auth: ResolvedAuth;
  /**
   * Mutated by the runner as messages stream in. The Stop hook reads from
   * this object on every turn-end signal to decide whether to allow the
   * agent to stop or block with a re-prompt.
   */
  stopHookState: WizardStopHookState;
  prompt: AsyncIterableIterator<SDKUserMessage>;
}

export interface AgentIteratorHandle {
  iterator: AsyncIterable<unknown>;
  /**
   * Soft-cancel the in-flight turn via the SDK control channel. The CLI
   * subprocess stops the current model response / tool batch and emits a
   * final `type: 'result'` message back through the iterator.
   */
  interrupt: () => Promise<void>;
  /**
   * Tear the session down: terminates the CLI subprocess, closes the
   * iterator, frees MCP transports.
   */
  close: () => void;
}

export interface SDKUserMessage {
  type: 'user';
  message: { role: 'user'; content: string };
  parent_tool_use_id: null;
  session_id: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const FALLBACK_MODEL = 'claude-3-5-sonnet-latest';

/**
 * Tools the agent is allowed to call without going through `canUseTool`.
 *
 * `tools` upstream uses the full `claude_code` preset (so the model knows
 * about Task / NotebookEdit / WebSearch / etc. — passing an explicit array
 * silently disables the rest of the preset). This list is the curated subset
 * that auto-approves; everything else falls through to `novuCanUseTool`.
 *
 * MCP patterns: the SDK accepts `mcp__<server>__<tool>` allowlist entries.
 * Listing them here means the agent can fire `mcp__novu__create_workflow`
 * without round-tripping through the permission gate.
 */
const WIZARD_AUTO_ALLOWED_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'TodoWrite',
  /**
   * Subagent dispatch is required for the parallel-fan-out architecture:
   * the main agent dispatches three subagents (Inbox / Workflows+Triggers /
   * Subscribers) in a single message so they run concurrently. Without
   * these entries the SDK falls through to `canUseTool`, which we use as
   * a defence-in-depth domain guard rather than a primary gate.
   *
   * The `claude_code` preset surfaces the dispatch tool as `Agent`, while
   * older flows / direct API calls use `Task` — auto-allow both so a
   * preset bump never silently disables fan-out.
   */
  'Task',
  'Agent',
  /**
   * Package installs run from the wizard's parent process (see
   * `pipeline/steps/install-packages.ts`) BEFORE the agent turn starts.
   * We deliberately don't auto-allow `Bash(npm install:*)` etc. any
   * more — `WIZARD_DISALLOWED_TOOLS` actively blocks those prefixes so
   * the agent can't waste minutes retrying inside the sandbox where
   * macOS `clonefile()` is blocked.
   * 'Bash(npm install:*)',
   * 'Bash(npm i:*)',
   * 'Bash(pnpm add:*)',
   * 'Bash(pnpm install:*)',
   * 'Bash(yarn add:*)',
   * 'Bash(yarn install:*)',
   * 'Bash(bun add:*)',
   * 'Bash(bun install:*)',
   */
  'WebFetch(domain:docs.novu.co)',
  'Skill',
  'ListMcpResourcesTool',
  'mcp__novu__create_workflow',
  'mcp__novu__update_workflow',
  'mcp__novu__list_workflows',
  'mcp__novu__get_workflow',
  'mcp__novu__delete_workflow',
  'mcp__novu__create_subscriber',
  'mcp__novu__update_subscriber',
  'mcp__novu__trigger_event',
  'mcp__novu__list_environments',
];

const WIZARD_DISALLOWED_TOOLS = [
  'Bash(rm:*)',
  'Bash(sudo:*)',
  'Bash(curl:*)',
  'Bash(wget:*)',
  'Bash(chmod:*)',
  'Bash(chown:*)',
  'Bash(mv:*)',
  'Bash(kill:*)',
  'Bash(killall:*)',
  'Bash(git push:*)',
  'Bash(git commit:*)',
  'Bash(git reset:*)',
  'Bash(git rebase:*)',
  'Bash(npm publish:*)',
  'Bash(pnpm publish:*)',
  'Bash(yarn publish:*)',
  /**
   * Block package-install invocations inside the agent turn — the
   * wizard CLI pre-installs everything outside the sandbox. A retry
   * here would cost several minutes for nothing (macOS `clonefile()`
   * is blocked by the SDK sandbox).
   */
  'Bash(npm install:*)',
  'Bash(npm i:*)',
  'Bash(pnpm add:*)',
  'Bash(pnpm install:*)',
  'Bash(yarn add:*)',
  'Bash(yarn install:*)',
  'Bash(bun add:*)',
  'Bash(bun install:*)',
];

const DEFAULT_MCP_URL_US = 'https://mcp.novu.co/';
const DEFAULT_MCP_URL_EU = 'https://mcp.novu.co/?region=eu';

export function resolveMcpUrl(override: string | undefined, region: ResolvedAuth['region']): string {
  const trimmed = override?.trim();

  if (region === CloudRegionEnum.LOCAL) {
    return `${trimmed ?? 'http://localhost:8787'}/?region=local`;
  }
  if (region === CloudRegionEnum.EU) {
    return DEFAULT_MCP_URL_EU;
  }

  return DEFAULT_MCP_URL_US;
}

export function buildSDKUserMessage(content: string): SDKUserMessage {
  return {
    type: 'user',
    message: { role: 'user', content },
    parent_tool_use_id: null,
    session_id: '',
  };
}

export async function createAgentIterator(input: CreateAgentIteratorInput): Promise<AgentIteratorHandle> {
  const { options, auth, stopHookState, prompt } = input;

  let query: typeof import('@anthropic-ai/claude-agent-sdk')['query'];
  try {
    ({ query } = await import('@anthropic-ai/claude-agent-sdk'));
  } catch {
    throw new Error(
      'The @anthropic-ai/claude-agent-sdk package is required to run `novu wizard`.\n' +
        'Install it with: npm install -g @anthropic-ai/claude-agent-sdk'
    );
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ANTHROPIC_BASE_URL: `${auth.apiUrl.replace(/\/$/, '')}/v2/llm`,
    ANTHROPIC_AUTH_TOKEN: auth.secretKey,
    /**
     * Defer MCP tool schemas to avoid bloating the system prompt.
     */
    ENABLE_TOOL_SEARCH: 'auto:0',
  };

  delete env.ANTHROPIC_API_KEY;

  const mcpUrl = resolveMcpUrl(options.mcpUrl, auth.region);
  const debugEnabled = process.env.NOVU_WIZARD_DEBUG === 'true' || process.env.NOVU_WIZARD_DEBUG === '1';
  const stopHook = createWizardStopHook(stopHookState, { maxRetries: 3 });

  const sdkQuery = query({
    prompt,
    options: {
      model: options.model ?? DEFAULT_MODEL,
      fallbackModel: FALLBACK_MODEL,
      cwd: process.cwd(),
      /**
       * 1M-context beta. Larger projects (mature Next.js apps with many
       * routes / components) easily blow past 200k tokens once the agent has
       * surveyed the codebase and read a few skill files. Without this beta
       * the agent silently truncates context mid-run.
       */
      betas: ['context-1m-2025-08-07'],
      /**
       * Use Claude Code's preset prompt and *append* Wizard-wide commandments.
       * The preset is what injects the auto-discovered skill listing prelude
       * into the system prompt — switching to a raw string would silently
       * disable native skill loading.
       *
       * `excludeDynamicSections: true` strips the per-user dynamic sections
       * (cwd, auto-memory, git status) out of the preset and re-injects them
       * as the first user message. That keeps the preset prefix byte-identical
       * across sessions/users so Anthropic's prompt cache can hit on it.
       */
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: buildSystemPrompt(),
        excludeDynamicSections: true,
      },
      /**
       * Required for the SDK to scan `.claude/skills/` (and `.claude/agents/`,
       * `CLAUDE.md`, `.claude/settings.json`) from the project. Without this
       * the skills written by `installSkills` are invisible to the agent.
       */
      settingSources: ['project'],
      /**
       * Pass the full `claude_code` preset (Task subagents, NotebookEdit,
       * WebSearch, etc.) — passing an explicit string array silently disables
       * everything outside that array, which left the model unable to use
       * helpful built-ins. `allowedTools` and `canUseTool` below are still
       * the gating contract for *which* of those tools are actually invoked.
       */
      tools: { type: 'preset', preset: 'claude_code' },
      /**
       * `acceptEdits` auto-approves Read/Write/Edit/Glob/Grep without going
       * through `canUseTool`. Every other tool falls through to the callback
       * below — we explicitly decline the alternative `bypassPermissions`
       * mode because it requires `allowDangerouslySkipPermissions: true` and
       * even with that flag it surfaces every denial silently, which is
       * exactly the failure mode that produced the empty `Files changed` run
       * the user reported.
       */
      permissionMode: 'acceptEdits',
      allowedTools: WIZARD_AUTO_ALLOWED_TOOLS,
      disallowedTools: WIZARD_DISALLOWED_TOOLS,
      canUseTool: (toolName, toolInput) => {
        return Promise.resolve(novuCanUseTool(toolName, toolInput as Record<string, unknown>));
      },
      sandbox: {
        enabled: true,
        allowUnsandboxedCommands: false,
        filesystem: {
          allowWrite: [
            '/' + process.cwd(),
            '/' + process.cwd() + '/**',
            '//tmp',
            '//tmp/**',
            '//private/tmp',
            '//private/tmp/**',
            // Package manager stores — allow writes so pnpm/npm can
            // install packages without breaking the user's existing setup
            '~/Library/pnpm/store/**', // pnpm global store (macOS)
            '~/.local/share/pnpm/store/**', // pnpm global store (Linux)
            '~/.pnpm-store/**', // pnpm alternate store
            '~/.npm/**', // npm cache
            '~/.yarn/**', // yarn classic cache
            '~/.yarn/berry/**', // yarn berry cache
          ],
        },
        network: {
          allowedDomains: [
            'docs.novu.co',
            'github.com',
            'api.github.com',
            'raw.githubusercontent.com',
            'release-assets.githubusercontent.com',
            'objects.githubusercontent.com',
          ],
        },
      },
      mcpServers: {
        novu: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', 'mcp-remote', mcpUrl, '--header', `Authorization:Bearer ${auth.secretKey}`],
        },
      },
      /**
       * Stop hook — the single most important guard against silent no-op
       * runs. The closure reads `stopHookState` (mutated by the runner as
       * messages stream in) and BLOCKS the agent from ending the turn until
       * either the report has been written or `maxRetries` re-prompts have
       * been issued.
       */
      hooks: {
        Stop: [
          {
            hooks: [stopHook],
            timeout: 30,
          },
        ],
      },
      env,
      debug: debugEnabled,
      stderr: debugEnabled ? (data: string) => process.stderr.write(chalk.gray(`[claude-code] ${data}`)) : undefined,
    },
  });

  const interrupt = async (): Promise<void> => {
    try {
      await sdkQuery.interrupt();
    } catch {
      // best-effort
    }
  };

  const close = (): void => {
    try {
      sdkQuery.close();
    } catch {
      // best-effort
    }
  };

  return { iterator: sdkQuery, interrupt, close };
}

/**
 * The user-facing first message — now a rich, STEP-numbered prompt produced
 * by `buildUserPrompt`. Experience shows the agent ships
 * materially more code edits when the "what to do now" lives in the
 * conversation rather than the system block.
 */
export function buildAutonomousUserMessage(input: {
  goal: WizardGoal;
  project: ProjectContext;
  auth: ResolvedAuth;
  installedSkills: InstalledSkill[];
  installResult?: InstallPackagesResult;
}): string {
  return buildUserPrompt(input);
}

export function isMainTurnResult(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false;
  const typed = message as { type?: string; parent_tool_use_id?: string | null };

  return typed.type === 'result' && (typed.parent_tool_use_id === null || typed.parent_tool_use_id === undefined);
}
