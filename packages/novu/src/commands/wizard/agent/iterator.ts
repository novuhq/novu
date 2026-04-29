import chalk from 'chalk';
import type { ProjectContext, ResolvedAuth, UserIntent, WizardCommandOptions } from '../types';
import { buildSystemPrompt } from './system-prompt';

export interface CreateAgentIteratorInput {
  options: WizardCommandOptions;
  auth: ResolvedAuth;
  project: ProjectContext;
  intent: UserIntent;
  initialMessage: string;
  prompt: AsyncIterableIterator<SDKUserMessage>;
}

export interface AgentIteratorHandle {
  iterator: AsyncIterable<unknown>;
  /**
   * Soft-cancel the in-flight turn via the SDK control channel. The CLI
   * subprocess stops the current model response / tool batch and emits a
   * final `type: 'result'` message back through the iterator, which is what
   * drives the UI back to `awaiting-input`. The session and MCP transports
   * stay alive — the user can submit a new prompt right after.
   */
  interrupt: () => Promise<void>;
  /**
   * Tear the session down: terminates the CLI subprocess, closes the
   * iterator, frees MCP transports. Use on `/exit`, the second Ctrl+C tap,
   * or React unmount.
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

const WIZARD_BUILT_IN_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Bash',
  'WebFetch',
  'Skill',
  'ListMcpResourcesTool',
] as const;

const WIZARD_AUTO_ALLOWED_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Bash(npm install:*)',
  'Bash(pnpm add:*)',
  'Bash(pnpm install:*)',
  'Bash(yarn add:*)',
  'Bash(bun add:*)',
  'WebFetch(domain:docs.novu.co)',
  'Skill',
  'ListMcpResourcesTool',
];

const WIZARD_DISALLOWED_TOOLS = [
  'Bash(rm:*)',
  'Bash(sudo:*)',
  'Bash(curl:*)',
  'Bash(wget:*)',
  'Bash(git push:*)',
  'Bash(git commit:*)',
  'Bash(git reset:*)',
  'Bash(git rebase:*)',
  'Bash(npm publish:*)',
  'Bash(pnpm publish:*)',
  'Bash(yarn publish:*)',
];

const DEFAULT_MCP_URL_US = 'https://mcp.novu.co/';
const DEFAULT_MCP_URL_EU = 'https://mcp.novu.co/?region=eu';

function resolveMcpUrl(override: string | undefined, region: ResolvedAuth['region']): string {
  const trimmed = override?.trim();

  return region === 'local'
    ? `${trimmed ?? 'http://localhost:8787'}/?region=local`
    : region === 'eu'
      ? DEFAULT_MCP_URL_EU
      : DEFAULT_MCP_URL_US;
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
  const { options, auth, project, intent, prompt } = input;

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
    ENABLE_TOOL_SEARCH: 'auto:0',
  };

  delete env.ANTHROPIC_API_KEY;

  const mcpUrl = resolveMcpUrl(options.mcpUrl, auth.region);
  const debugEnabled = process.env.NOVU_WIZARD_DEBUG === 'true' || process.env.NOVU_WIZARD_DEBUG === '1';

  const sdkQuery = query({
    prompt,
    options: {
      model: options.model ?? DEFAULT_MODEL,
      fallbackModel: FALLBACK_MODEL,
      cwd: process.cwd(),
      /**
       * Use Claude Code's preset prompt and *append* Wizard-specific guidance.
       * The preset is what injects the auto-discovered skill listing prelude
       * into the system prompt — switching to a raw string would silently
       * disable native skill loading.
       *
       * `excludeDynamicSections: true` strips the per-user dynamic sections
       * (cwd, auto-memory, git status) out of the preset and re-injects them
       * as the first user message. That keeps the preset prefix byte-identical
       * across sessions/users so Anthropic's prompt cache can hit on it. Pair
       * this with `buildSystemPrompt`, which puts its own static block first
       * and the session-specific block last for the same reason.
       */
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: buildSystemPrompt({ project, intent, auth }),
        excludeDynamicSections: true,
      },
      /**
       * Required for the SDK to scan `.claude/skills/` (and `.claude/agents/`,
       * `CLAUDE.md`, `.claude/settings.json`) from the project. Without this
       * the skills written by `installSkills` are invisible to the agent.
       */
      settingSources: ['project'],
      tools: [...WIZARD_BUILT_IN_TOOLS],
      permissionMode: 'bypassPermissions',
      allowedTools: WIZARD_AUTO_ALLOWED_TOOLS,
      disallowedTools: WIZARD_DISALLOWED_TOOLS,
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
      env,
      debug: debugEnabled,
      stderr: debugEnabled ? (data: string) => process.stderr.write(chalk.gray(`[claude-code] ${data}`)) : undefined,
    },
  });

  /**
   * Cooperative cancel. The SDK rejects this if the session was never fully
   * initialised (e.g. auth still pending) or has already torn down — neither
   * is actionable for the UI, so we swallow the error rather than surfacing
   * a confusing toast. The follow-up `result` message that the CLI emits in
   * response is what actually flips the UI phase.
   */
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
 * The user-facing first message — kept to bare goal context. All instructional
 * "survey the project / propose a plan / wait for confirmation" guidance lives
 * in the system prompt (see `initialDirectiveForIntent` in `system-prompt.ts`)
 * so it never shows up as words the user appears to have typed.
 */
export function buildInitialUserMessage(intent: UserIntent): string {
  const lines = [`Goal: ${intent.summary}`, intent.notes ? `User notes: ${intent.notes}` : ''].filter(Boolean);

  return lines.join('\n');
}

export function isMainTurnResult(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false;
  const typed = message as { type?: string; parent_tool_use_id?: string | null };

  return typed.type === 'result' && (typed.parent_tool_use_id === null || typed.parent_tool_use_id === undefined);
}
