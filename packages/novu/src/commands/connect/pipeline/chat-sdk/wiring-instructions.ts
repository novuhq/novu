export const CHAT_SDK_ADAPTER_README_URL = 'https://www.npmjs.com/package/@novu/chat-sdk-adapter';
export const CHAT_SDK_EXAMPLE_URL = 'https://github.com/novuhq/novu-chat-sdk-example';

export function buildCodeWiringInstructions(projectDir: string): string {
  return [
    'Wire the Novu adapter into your existing Chat SDK bot:',
    '',
    '1. Install deps if needed: @novu/chat-sdk-adapter and chat (state adapter only if you do not already have @chat-adapter/state-*)',
    '2. Merge createNovuAdapter into your existing Chat({ adapters: { ... } }) — one bot only.',
    '3. Expose POST /api/webhooks/novu (or reuse app/api/webhooks/[platform]/route.ts).',
    '4. Use npm run dev:novu for local dev so Novu can reach your bridge.',
    '',
    `Project: ${projectDir}`,
    `Adapter docs: ${CHAT_SDK_ADAPTER_README_URL}`,
    `Example app: ${CHAT_SDK_EXAMPLE_URL}`,
  ].join('\n');
}
