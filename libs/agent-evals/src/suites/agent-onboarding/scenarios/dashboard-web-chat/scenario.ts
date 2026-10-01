import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scenarioDir, 'project');

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'dashboard-web-chat',
  category: 'authenticated',
  description: 'Dashboard Web Chat prompt uses the dedicated channel and follows the embed handoff.',
  userPrompt:
    "I'm signed in to the Novu dashboard, so use dashboard login (not keyless mode). Connect a Novu agent to Web Chat for this project following instructions from this markdown file: https://novu.co/agents.md",
  projectRoot,
  scriptedAnswers: [{ questionContains: 'description', optionId: 'approve' }],
  tape: connectTape({
    requireNoKeyless: true,
    allowedChannels: ['web-chat'],
    chunks: [
      {
        stdout: `NOVU_CONNECT_AUTH_URL_FILE=${path.join(projectRoot, 'novu-connect-auth-url.txt')}`,
      },
      {
        stdout: 'NOVU_CONNECT_WEB_CHAT_DASHBOARD_URL=https://dashboard.novu.test/env/dev/agents/chat-agent-1/chat',
      },
      {
        stdout: `NOVU_CONNECT_WEB_CHAT_EMBED_PROMPT_FILE=${path.join(
          projectRoot,
          'novu-connect-web-chat-embed-prompt.txt'
        )}`,
      },
      {
        stdout: [
          '✓ Web Chat connected',
          '  Updated .env.local with your Novu keys.',
          '  Next: Copy the setup prompt below into your coding agent.',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
