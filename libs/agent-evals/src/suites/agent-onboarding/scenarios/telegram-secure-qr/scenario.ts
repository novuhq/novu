import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));
const qrPath = path.join(scenarioDir, 'project/telegram-setup-qr.png');

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'telegram-secure-qr',
  category: 'keyless',
  description: 'Telegram secure setup with host-aware QR delivery via open.',
  userPrompt: 'Connect a Novu agent to Telegram for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'telegram' },
    { questionContains: 'description', optionId: 'approve' },
    { questionContains: 'token', optionId: 'secure' },
  ],
  tape: connectTape({
    requireKeyless: true,
    allowedChannels: ['telegram'],
    chunks: [
      { stdout: 'NOVU_CONNECT_TELEGRAM_BOTFATHER_URL=https://t.me/botfather' },
      { stdout: 'NOVU_CONNECT_TELEGRAM_SETUP_URL=https://setup.novu.test/telegram/abc' },
      { stdout: `NOVU_CONNECT_TELEGRAM_SETUP_QR_PNG=${qrPath}` },
      { stdout: 'NOVU_CONNECT_TELEGRAM_DEEPLINK_URL=https://t.me/cellar_support_bot?start=connect' },
      { stdout: 'NOVU_CONNECT_TELEGRAM_BOT_USERNAME=cellar_support_bot' },
      { stdout: `NOVU_CONNECT_TELEGRAM_DEEPLINK_QR_PNG=${qrPath}` },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Telegram Agent (telegram-agent-1)',
          '  → Check Telegram — your agent just messaged you.',
          '  Claim your agent: https://dashboard.novu.test/claim/telegram-token',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
