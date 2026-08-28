import { APPLICATION_IDENTIFIER_PLACEHOLDER, SUBSCRIBER_ID_PLACEHOLDER } from './connect-embed-prompt-constants';

export { APPLICATION_IDENTIFIER_PLACEHOLDER, SUBSCRIBER_ID_PLACEHOLDER } from './connect-embed-prompt-constants';

export const CONNECT_EMBED_DOCS_INDEX = 'https://docs.novu.co/llms.txt';

export const CONNECT_EMBED_TEMPLATE_URL =
  'https://github.com/novuhq/novu/tree/next/packages/novu/src/commands/connect/templates/web-chat/ts';

export const CONNECT_EMBED_TEMPLATE_LOCAL_PATH = 'packages/novu/src/commands/connect/templates/web-chat/ts';

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

export function formatConnectEmbedRuntimeLabel(connectMode: ConnectEmbedRuntime): string {
  switch (connectMode) {
    case 'ai-sdk':
      return 'AI SDK';
    case 'langchain':
      return 'LangChain';
    case 'chat-sdk':
      return 'Chat SDK';
    case 'custom-code':
      return 'custom code';
    case 'claude':
      return 'Claude managed';
    case 'claude-aws':
      return 'AWS Claude managed';
    case 'demo':
      return 'demo';
    default:
      return 'AI SDK';
  }
}

export function describeConnectEmbedPromptAction(connectMode: ConnectEmbedRuntime): string {
  if (!SELF_HOSTED_RUNTIMES.has(connectMode)) {
    return 'The prompt guides your agent to connect Web Chat in this project.';
  }

  const runtime = formatConnectEmbedRuntimeLabel(connectMode);
  return `The prompt guides your agent to wire an ${runtime} agent and connect Web Chat in this project.`;
}

export type ConnectEmbedDocLink = {
  label: string;
  url: string;
};

export function resolveConnectEmbedDocLinks(input: {
  connectMode: ConnectEmbedRuntime;
  handlerWired?: boolean;
}): ConnectEmbedDocLink[] {
  const links: ConnectEmbedDocLink[] = [];

  if (shouldIncludeHandlerSection(input.connectMode, input.handlerWired)) {
    switch (input.connectMode) {
      case 'ai-sdk':
        links.push(
          { label: 'Agent handler (AI SDK)', url: 'https://docs.novu.co/agents/get-started/ai-sdk.md' },
          {
            label: 'Connecting your app',
            url: 'https://docs.novu.co/agents/custom-code-agent/connecting-your-app.md',
          }
        );
        break;
      case 'langchain':
        links.push(
          { label: 'Agent handler (LangChain)', url: 'https://docs.novu.co/agents/get-started/langchain.md' },
          {
            label: 'Connecting your app',
            url: 'https://docs.novu.co/agents/custom-code-agent/connecting-your-app.md',
          }
        );
        break;
      case 'chat-sdk':
        links.push({
          label: 'Chat SDK adapter',
          url: 'https://www.npmjs.com/package/@novu/chat-sdk-adapter',
        });
        break;
      case 'custom-code':
        links.push(
          {
            label: 'Connecting your app',
            url: 'https://docs.novu.co/agents/custom-code-agent/connecting-your-app.md',
          },
          {
            label: 'Custom code patterns',
            url: 'https://docs.novu.co/agents/custom-code-agent/frameworks/other.md',
          }
        );
        break;
      default:
        break;
    }
  }

  links.push(
    { label: 'Web Chat UI', url: 'https://docs.novu.co/agents/channels/web-chat/quickstart.md' },
    { label: 'useWebChat hook', url: 'https://docs.novu.co/platform/sdks/react/hooks/use-web-chat.md' }
  );

  return links;
}

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
    renderWebChatSection({ subscriberId }),
    renderVerifySection(includeHandler),
    renderDocsSection(),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/** @deprecated Prefer buildConnectEmbedPrompt — kept for dashboard Web Chat banner (UI-only). */
export function buildWebChatEmbedPromptForAuth(input: {
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

  return `# Wire Novu Web Chat in this project

You are a coding agent working in this repository.

## Context (connect already ran)

- Do **not** run \`npx novu connect\` again.
- Agent: ${input.agentName} — identifier **\`${input.agentId}\`** (must match \`agent('…')\` in code).
- Web Chat integration is already linked in the dashboard.
${envLine}

### Env vars connect uses (read; do not hardcode)

- \`NEXT_PUBLIC_NOVU_APP_ID\` → \`NovuProvider\` \`applicationIdentifier\` (\`${input.appId}\`)
- \`NEXT_PUBLIC_NOVU_SUBSCRIBER_ID\` → subscriber id (smoke test only if app has no auth yet: \`${input.subscriberId}\`)
- \`NEXT_PUBLIC_NOVU_AGENT_ID\` → \`useWebChat({ agentId: … })\` (use \`${input.agentId}\`)
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
- Use \`toModelMessages(ctx)\`; do not call \`ctx.reply()\` when returning \`generateText()\`.
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

function renderWebChatSection(input: { subscriberId: string }): string {
  return `## Part 2 — Web Chat UI

Follow these docs (fetch as \`.md\`). **Skip** dashboard channel-setup steps.

- https://docs.novu.co/agents/channels/web-chat/quickstart.md — hook + parts API
- https://docs.novu.co/platform/sdks/react/hooks/use-web-chat.md — hook reference

Must render (capabilities only — match this app's routing, components, and styling):

- Empty state + 2–3 starter prompts
- \`message.parts\`: text (markdown + streaming cursor), tool rows, cards (\`sendAction\`)
- Approvals + MCP authorize **in the thread** via \`respondToAction\` / authorize URL — not a footer stack
- Thinking indicator from \`typing\` / \`isRunning\` ("Thinking…"); hide it while a pending approval or MCP connect is on screen
- Composer disabled while \`isRunning\` / \`isLoading\`
- Error banner
- Optional: load older messages with \`pagination.hasMore\` / \`pagination.fetchMore\`

If you need a working example of those capabilities:

- GitHub: ${CONNECT_EMBED_TEMPLATE_URL}
- Novu monorepo only: \`${CONNECT_EMBED_TEMPLATE_LOCAL_PATH}/\`

Hard rules (partly in docs, rest connect-specific):

- Install \`@novu/react\`; no \`<WebChat />\` component exists.
- Wire env vars from the Context section; do not hardcode identifiers in source.
- Pass \`socketUrl\` from env as-is — do not rewrite \`127.0.0.1\` to \`localhost\` or swap in \`socket.novu.co\`.
- Do not gate the first send behind a second click or a "connected" wait the SDK does not expose.
- **Match this app's design system** — do not paste scaffold CSS, dashboard components, or dashboard tokens.
- If HMAC is enabled: follow the quickstart "Going to production" section for \`subscriberHash\` / \`agentHash\`.
- When the app has no auth yet, use subscriber id \`${input.subscriberId}\` — do not send a test message to prove it.`;
}

function renderVerifySection(includeHandler: boolean): string {
  const lines = [
    '## Verify',
    '',
    'Do **not** open a browser, send a chat message, or inspect WebSocket traffic.',
    '',
    '- Skim the files you added for missing imports or hardcoded ids. Do not start `dev` or run a full-project typecheck.',
    '- `NovuProvider` and `useWebChat` read the Context env vars — do not hardcode identifiers.',
    '- If `NEXT_PUBLIC_NOVU_SOCKET_URL` is set, pass it through as-is.',
  ];

  if (includeHandler) {
    lines.push('- The Part 1 route/handler files exist. Do not curl them.');
  }

  lines.push(
    '',
    "Then tell the user: run `npm run dev:novu` (or this project's equivalent) and send a message in Web Chat."
  );

  return lines.join('\n');
}

function renderDocsSection(): string {
  return `## Discovery

${CONNECT_EMBED_DOCS_INDEX} — append \`.md\` to doc paths for markdown.`;
}
