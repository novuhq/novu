import {
  buildNovuConnectStagingHint,
  formatNovuConnectCommandForDisplay,
  getNovuConnectInvocation,
  getNovuConnectTargetFlags,
  isNovuStagingApiUrl,
  type NovuConnectTargetOptions,
  normalizeConnectTargetOptions,
} from './novu-connect-cli';

export const AGENT_CHAT_DOCS_URL = 'https://docs.novu.co/agents/channels/agent-chat';
export const AGENT_ONBOARDING_PLAYBOOK_URL = 'https://novu.co/agents.md';

export const NOVU_CONNECT_BRIDGE_RUNTIMES = ['ai-sdk', 'langchain', 'custom-code'] as const;
export type NovuConnectBridgeRuntime = (typeof NOVU_CONNECT_BRIDGE_RUNTIMES)[number];

export function isNovuConnectBridgeRuntime(value: string | null | undefined): value is NovuConnectBridgeRuntime {
  return value === 'ai-sdk' || value === 'langchain' || value === 'custom-code';
}

function bridgeRuntimeLabel(runtime: NovuConnectBridgeRuntime): string {
  switch (runtime) {
    case 'ai-sdk':
      return 'AI SDK';
    case 'langchain':
      return 'LangChain';
    case 'custom-code':
      return 'custom code';
  }
}

export type BuildAgentChatTuiCommandOptions = NovuConnectTargetOptions & {
  agentIdentifier?: string | null;
  runtime?: NovuConnectBridgeRuntime | null;
};

export function buildAgentChatTuiCommandParts(
  apiUrlOrOptions?: string | null | BuildAgentChatTuiCommandOptions
): string[] {
  const options = normalizeConnectTargetOptions<BuildAgentChatTuiCommandOptions>(apiUrlOrOptions);
  const runtime = options.runtime && isNovuConnectBridgeRuntime(options.runtime) ? options.runtime : undefined;
  const parts = [
    runtime
      ? `${getNovuConnectInvocation(options.apiUrl)} --runtime ${runtime} --channel agent-chat`
      : `${getNovuConnectInvocation(options.apiUrl)} --channel agent-chat`,
    ...getNovuConnectTargetFlags(options),
  ];
  const agentIdentifier = options.agentIdentifier?.trim();

  if (agentIdentifier) {
    parts.push(`--agent-identifier ${agentIdentifier}`);
  }

  return parts;
}

export function buildAgentChatTuiCommand(apiUrlOrOptions?: string | null | BuildAgentChatTuiCommandOptions): string {
  return buildAgentChatTuiCommandParts(apiUrlOrOptions).join(' ');
}

export function buildAgentChatTuiCommandForDisplay(
  apiUrlOrOptions?: string | null | BuildAgentChatTuiCommandOptions
): string {
  return formatNovuConnectCommandForDisplay(buildAgentChatTuiCommandParts(apiUrlOrOptions));
}

/** Production TUI command. Prefer `buildAgentChatTuiCommand(apiUrl)` in the dashboard. */
export const NOVU_CONNECT_AGENT_CHAT_TUI_COMMAND = buildAgentChatTuiCommand();

export {
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  SUBSCRIBER_ID_PLACEHOLDER,
} from './connect-embed-prompt-constants';

function signedInDashboardLine(apiUrl?: string | null): string {
  if (isNovuStagingApiUrl(apiUrl)) {
    return `I'm signed in to the Novu staging dashboard, so use dashboard login (not keyless mode).`;
  }

  return `I'm signed in to the Novu dashboard, so use dashboard login (not keyless mode).`;
}

export type BuildAgentChatPromptOptions = {
  runtime?: NovuConnectBridgeRuntime | null;
};

/**
 * Dashboard Copy prompt / Open in Cursor text. Same shape as the onboarding
 * prompt: signed-in line + intent + agents.md. The playbook owns `--ci`,
 * questions, and flags. Staging and local dev use `novu@rc` (staging also passes `--region staging`).
 *
 * When `runtime` is set, this is a dashboard-created bridge agent: one connect
 * run must scaffold the handler and attach Agent Chat. Do not ask for runtime or channel again.
 */
export function buildAgentChatPrompt(
  agentName: string,
  agentIdentifier: string,
  apiUrl?: string | null,
  promptOptions?: BuildAgentChatPromptOptions
): string {
  const runtime =
    promptOptions?.runtime && isNovuConnectBridgeRuntime(promptOptions.runtime) ? promptOptions.runtime : undefined;

  if (runtime) {
    const lines = [
      `${signedInDashboardLine(apiUrl)} Add Agent Chat to this project for an existing ${bridgeRuntimeLabel(runtime)} bridge agent following instructions from this markdown file: ${AGENT_ONBOARDING_PLAYBOOK_URL}`,
      buildNovuConnectStagingHint(apiUrl),
      `The dashboard already created "${agentName}" (id: ${agentIdentifier}) with ${bridgeRuntimeLabel(runtime)} and Agent Chat selected. Run one \`npx novu connect\` with \`--runtime ${runtime} --channel agent-chat --agent-identifier ${agentIdentifier}\`. Do not ask me to pick runtime, channel, or agent. Scaffold or embed in that same run, then start the app with \`npm run dev:novu\`.`,
    ].filter((line): line is string => Boolean(line));

    return lines.join('\n\n');
  }

  const lines = [
    `${signedInDashboardLine(apiUrl)} Connect a Novu agent to Agent Chat for this project following instructions from this markdown file: ${AGENT_ONBOARDING_PLAYBOOK_URL}`,
    buildNovuConnectStagingHint(apiUrl),
    `The dashboard already has "${agentName}" (id: ${agentIdentifier}) with Agent Chat linked for preview.`,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n\n');
}

export function buildOnboardingAgentPrompt(apiUrl?: string | null): string {
  const lines = [
    `${signedInDashboardLine(apiUrl)} Connect a Novu agent to Agent Chat for this project following instructions from this markdown file: ${AGENT_ONBOARDING_PLAYBOOK_URL}`,
    buildNovuConnectStagingHint(apiUrl),
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n\n');
}

export { buildAgentChatEmbedPromptForAuth } from './connect-embed-prompt';
