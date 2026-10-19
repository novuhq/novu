/**
 * Paste-ready prompt for the user's own coding agent to finish wiring the Novu
 * Chat SDK adapter into an existing bot. Kept as plain static text — the agent
 * inspects the project itself for architecture and existing adapters.
 */
export const CHAT_SDK_AGENT_PROMPT = [
  'You are a coding agent working directly in this repository. Wire the Novu Chat SDK adapter into this existing Chat SDK bot so Novu can drive it as a channel.',
  '',
  '## First, inspect the project',
  '- Chat setup: find where the bot is constructed with Chat({ adapters: { ... } }) and which adapters/state adapter it already uses.',
  '- Package manager: infer from the lockfile (pnpm/yarn/bun/npm) and use it for any install.',
  '- Existing Novu wiring: search for @novu/chat-sdk-adapter / createNovuAdapter and any /api/webhooks route so you do not duplicate it.',
  '- Conventions: match the existing formatting, lint rules, naming, and import style.',
  '',
  '## Implement',
  '1. Install @novu/chat-sdk-adapter (add a chat state adapter only if the project does not already have one).',
  '2. Merge the Novu adapter into your existing single-bot Chat instance, reusing the current adapter setup:',
  '',
  '```ts',
  "import { createNovuAdapter } from '@novu/chat-sdk-adapter';",
  '',
  'const chat = new Chat({',
  '  adapters: {',
  '    // ...your existing adapters',
  '    novu: createNovuAdapter({ /* secret key / options per the adapter docs */ }),',
  '  },',
  '});',
  '```',
  '',
  '3. Expose a POST webhook (e.g. app/api/webhooks/novu/route.ts, or reuse an existing webhook route) so Novu can reach the bot. Read secrets from existing env vars — never hardcode them.',
  '',
  '## Verify',
  '- Run the project\u2019s dev:novu script and confirm Novu can reach the bridge without errors.',
  '',
  '## Authoritative docs',
  '- Adapter API: https://www.npmjs.com/package/@novu/chat-sdk-adapter',
  '- Example app: https://github.com/novuhq/novu-chat-sdk-example',
  '- Fetch https://docs.novu.co/llms.txt for Novu docs, and append .md to any doc URL for clean markdown.',
].join('\n');
