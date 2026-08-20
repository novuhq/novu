import { APPLICATION_IDENTIFIER_PLACEHOLDER, SUBSCRIBER_ID_PLACEHOLDER } from './connect-embed-prompt-constants';

export { APPLICATION_IDENTIFIER_PLACEHOLDER, SUBSCRIBER_ID_PLACEHOLDER } from './connect-embed-prompt-constants';

export const CONNECT_EMBED_DOCS_INDEX = 'https://docs.novu.co/llms.txt';

export type ConnectEmbedRuntime =
  | 'ai-sdk'
  | 'langchain'
  | 'custom-code'
  | 'chat-sdk'
  | 'demo'
  | 'claude'
  | 'claude-aws';

export type ConnectEmbedPromptInput = {
  agentName: string;
  agentIdentifier: string;
  applicationIdentifier?: string | null;
  subscriberId?: string | null;
  envPaths?: string[];
  connectMode: ConnectEmbedRuntime;
  /** When true, omit the self-hosted handler section (already wired or managed runtime). */
  handlerWired?: boolean;
};

const SELF_HOSTED_RUNTIMES = new Set<ConnectEmbedRuntime>(['ai-sdk', 'langchain', 'custom-code', 'chat-sdk']);

export function buildConnectEmbedPrompt(input: ConnectEmbedPromptInput): string {
  const agentName = input.agentName.trim() || 'Agent';
  const agentId = input.agentIdentifier.trim();
  const appId = input.applicationIdentifier?.trim() || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const subscriberId = input.subscriberId?.trim() || SUBSCRIBER_ID_PLACEHOLDER;
  const envPaths = input.envPaths?.filter(Boolean) ?? [];
  const includeHandler = shouldIncludeHandlerSection(input.connectMode, input.handlerWired);

  const sections = [
    renderHeader({ agentName, agentId, appId, subscriberId, envPaths }),
    renderInspectSection(),
    ...(includeHandler ? [renderHandlerSection(input.connectMode, agentId)] : []),
    renderAgentChatSection({ subscriberId }),
    renderVerifySection(includeHandler),
    renderDocsSection(),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/** @deprecated Prefer buildConnectEmbedPrompt — kept for dashboard Agent Chat banner (UI-only). */
export function buildAgentChatEmbedPromptForAuth(input: {
  agentName: string;
  agentIdentifier: string;
  applicationIdentifier?: string | null;
  subscriberId?: string | null;
  envPaths?: string[];
}): string {
  return buildConnectEmbedPrompt({
    ...input,
    connectMode: 'ai-sdk',
    handlerWired: true,
  });
}

function shouldIncludeHandlerSection(connectMode: ConnectEmbedRuntime, handlerWired?: boolean): boolean {
  if (!SELF_HOSTED_RUNTIMES.has(connectMode)) {
    return false;
  }

  return handlerWired !== true;
}

function renderHeader(input: {
  agentName: string;
  agentId: string;
  appId: string;
  subscriberId: string;
  envPaths: string[];
}): string {
  const envLine =
    input.envPaths.length > 0
      ? `- Connect may have updated: ${input.envPaths.join(', ')} — read env from there / \`process.env\`.`
      : '- Connect may have updated `.env.local` — read env from there / `process.env`.';

  return `# Wire Novu Agent Chat in this project

You are a coding agent working in this repository.

## Context (connect already ran)

- Do **not** run \`npx novu connect\` again.
- Agent: ${input.agentName} — identifier **\`${input.agentId}\`** (must match \`agent('…')\` in code).
- Agent Chat integration is already linked in the dashboard.
${envLine}

### Env vars connect uses (read; do not hardcode)

- \`NEXT_PUBLIC_NOVU_APP_ID\` → \`NovuProvider\` \`applicationIdentifier\` (\`${input.appId}\`)
- \`NEXT_PUBLIC_NOVU_SUBSCRIBER_ID\` → subscriber id (smoke test only if app has no auth yet: \`${input.subscriberId}\`)
- \`NEXT_PUBLIC_NOVU_AGENT_ID\` → \`useAgentChat({ agentId: … })\` (use \`${input.agentId}\`)
- \`NEXT_PUBLIC_NOVU_BACKEND_URL\` — **only if set**; if unset (US Cloud), omit \`apiUrl\` on \`NovuProvider\`
- \`NEXT_PUBLIC_NOVU_SOCKET_URL\` — **only if set**; if unset (US Cloud), omit \`socketUrl\`
- Local dev: if socket URL is present, use **\`ws://127.0.0.1:8787\`** as connect wrote — do not change to \`localhost\`

Also ensure server-side \`NOVU_SECRET_KEY\` (and your LLM provider keys) exist for the bridge handler when you wire one.`;
}

function renderInspectSection(): string {
  return `## Inspect this project first

- Router: App Router vs Pages Router, \`src/\` or not, where API routes live.
- Package manager: read the lockfile (pnpm, yarn, bun, or npm).
- Existing Novu code: search for \`@novu/framework\`, \`@novu/react\`, and existing API routes — do not duplicate.
- LLM / provider: read \`package.json\` and env vars for providers already in use.
- Match existing formatting, lint rules, naming, and imports.`;
}

function renderHandlerSection(connectMode: ConnectEmbedRuntime, agentId: string): string {
  switch (connectMode) {
    case 'ai-sdk':
      return renderAiSdkHandlerSection(agentId);
    case 'langchain':
      return renderLangChainHandlerSection(agentId);
    case 'chat-sdk':
      return renderChatSdkHandlerSection(agentId);
    case 'custom-code':
      return renderCustomCodeHandlerSection(agentId);
    default:
      return '';
  }
}

function renderAiSdkHandlerSection(agentId: string): string {
  return `## Part 1 — Agent handler (AI SDK)

Follow these docs (fetch as \`.md\`). **Skip** dashboard "create agent / connect Slack" steps — connect did that.

- https://docs.novu.co/agents/get-started/ai-sdk.md — install, handler, bridge route, env
- https://docs.novu.co/agents/custom-code-agent/connecting-your-app.md — if stack is not Next.js
- https://docs.novu.co/agents/custom-code-agent/frameworks/ai-sdk.md — adapter details if needed

Hard rules (also in docs):

- Use **\`${agentId}\`** as the agent identifier everywhere.
- Use \`toModelMessages(ctx.history)\`; do not call \`ctx.reply()\` when returning \`generateText()\`.
- Reuse the project's existing AI SDK provider; never hardcode API keys.`;
}

function renderLangChainHandlerSection(agentId: string): string {
  return `## Part 1 — Agent handler (LangChain)

Follow these docs (fetch as \`.md\`). **Skip** dashboard "create agent / connect Slack" steps — connect did that.

- https://docs.novu.co/agents/get-started/langchain.md — install, handler, bridge route, env
- https://docs.novu.co/agents/custom-code-agent/connecting-your-app.md — if stack is not Next.js
- https://docs.novu.co/agents/custom-code-agent/frameworks/langchain.md — adapter details and Next.js \`serverExternalPackages\`

Hard rules (also in docs):

- Use **\`${agentId}\`** as the agent identifier everywhere.
- Return a \`LangChainAgentConfig\` from \`onMessage\`; reuse the project's LangChain provider; never hardcode API keys.`;
}

function renderChatSdkHandlerSection(agentId: string): string {
  return `## Part 1 — Agent handler (Chat SDK)

There is no Novu doc page for this adapter yet. Wire the Novu Chat SDK adapter into this project's existing Chat SDK bot.

1. Install \`@novu/chat-sdk-adapter\` if missing.
2. Merge \`createNovuAdapter()\` into the existing \`Chat({ adapters: { … } })\` instance. Read secrets from env vars.
3. Expose \`POST /api/webhooks/novu\` (or reuse an existing webhook route) so Novu can reach the bot.

Agent id: **\`${agentId}\`**

Reference: https://www.npmjs.com/package/@novu/chat-sdk-adapter`;
}

function renderCustomCodeHandlerSection(agentId: string): string {
  return `## Part 1 — Agent handler (custom code)

Follow these docs (fetch as \`.md\`). **Skip** dashboard "create agent" steps — connect did that.

- https://docs.novu.co/agents/custom-code-agent/connecting-your-app.md — bridge route and \`serve()\`
- https://docs.novu.co/agents/custom-code-agent/frameworks/other.md — \`agent()\` handler patterns

Hard rules:

- Use **\`${agentId}\`** as the agent identifier everywhere.
- Implement \`onMessage\` and \`onAction\` with your own logic; read \`NOVU_SECRET_KEY\` from env; never hardcode secrets.`;
}

function renderAgentChatSection(input: { subscriberId: string }): string {
  return `## Part 2 — Agent Chat UI

Follow these docs (fetch as \`.md\`). **Skip** dashboard channel-setup steps.

- https://docs.novu.co/agents/channels/agent-chat/quickstart.md — main UI guide
- https://docs.novu.co/platform/sdks/react/hooks/use-agent-chat.md — hook reference

Hard rules (partly in docs, rest connect-specific):

- Install \`@novu/react\`; no \`<AgentChat />\` component exists.
- Wire env vars from the Context section; do not hardcode identifiers in source.
- Render \`message.parts\`, a composer (disable while \`isRunning\` / \`isLoading\`), and tool approvals via \`respondToAction\`.
- **Match this app's routing and styling** — do not paste the connect scaffold template wholesale.
- If HMAC is enabled: follow the quickstart "Going to production" section for \`subscriberHash\` / \`agentHash\`.
- Smoke-test subscriber id when the app has no auth yet: \`${input.subscriberId}\``;
}

function renderVerifySection(includeHandler: boolean): string {
  const bridgeLine = includeHandler
    ? '- Confirm `/api/novu` (or your Chat SDK webhook route) responds without errors.'
    : '';

  return `## Verify

- Run \`npm run dev:novu\` (or this project's equivalent).
${bridgeLine}
- Open Agent Chat in the app; send **one** message — reply must appear on the **first** message.
- In DevTools → Network → WS: socket must hit your environment (e.g. \`127.0.0.1:8787\` locally), not \`socket.novu.co\` when testing against local API.`;
}

function renderDocsSection(): string {
  return `## Discovery

${CONNECT_EMBED_DOCS_INDEX} — append \`.md\` to doc paths for markdown.`;
}
