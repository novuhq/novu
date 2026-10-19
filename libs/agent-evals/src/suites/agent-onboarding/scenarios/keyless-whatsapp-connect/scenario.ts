import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'keyless-whatsapp-connect',
  category: 'keyless',
  description: 'Keyless WhatsApp is CLI-handled: tokenized Meta Embedded Signup handoff, then wa.me test message.',
  userPrompt: 'Connect a Novu agent to WhatsApp for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'dashboard' },
    { questionContains: 'whatsapp', optionId: 'whatsapp' },
    { questionContains: 'description', optionId: 'approve' },
  ],
  tape: connectTape({
    requireKeyless: true,
    allowedChannels: ['whatsapp'],
    chunks: [
      { stdout: 'NOVU_CONNECT_WHATSAPP_SIGNUP_URL=https://dashboard.novu.test/agents/whatsapp/connect/token-wa-1' },
      { stdout: 'NOVU_CONNECT_WHATSAPP_WA_ME_URL=https://wa.me/14155550100' },
      { stdout: 'NOVU_CONNECT_WHATSAPP_PHONE_NUMBER=+1 415-555-0100' },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Shop Chat Agent (shop-chat-agent-1)',
          '  → Check WhatsApp — your agent just messaged you.',
          '  Claim your agent: https://dashboard.novu.test/claim/whatsapp-token',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
