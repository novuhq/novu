import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'slack-in-chat-rerun',
  category: 'authenticated',
  description: 'Slack in_chat path kills first shell and reruns with --slack-config-token.',
  userPrompt: "I'm signed in to the Novu dashboard. Connect my agent to Slack.",
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'slack' },
    { questionContains: 'description', optionId: 'approve' },
    { questionContains: 'token', optionId: 'in_chat' },
  ],
  followUpMessages: ['Here is my Slack App Configuration Token: xoxe.xoxp-test-token'],
  followUpOnOptionId: 'in_chat',
  tape: connectTape({
    requireNoKeyless: true,
    allowedChannels: ['slack'],
    // The first (no-token) connect run mirrors the real CLI: it prints the Slack setup
    // URL and then waits for the config token, so it stays running until the agent kills
    // it. Only the re-run that supplies `--slack-config-token` exits on its own.
    pendingWhen: (flags) => !flags.slackConfigToken,
    chunks: [
      {
        stdout: `NOVU_CONNECT_AUTH_URL_FILE=${path.join(scenarioDir, 'project/novu-connect-auth-url.txt')}`,
      },
      {
        stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/rerun-1',
        when: (flags) => !flags.slackConfigToken,
      },
      {
        stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/rerun-token',
        when: (flags) => Boolean(flags.slackConfigToken),
      },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Slack Rerun Agent (slack-rerun-1)',
          '  → Check Slack — your agent just messaged you.',
          '  Dashboard: https://dashboard.novu.test/agents/slack-rerun-1',
        ].join('\n'),
        when: (flags) => Boolean(flags.slackConfigToken),
      },
    ],
    exitCode: 0,
  }),
};
