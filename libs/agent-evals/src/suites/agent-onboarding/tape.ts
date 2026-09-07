import type { Tape, TapeChunk } from '../../core/types.js';
import { type ConnectFlags, type ConnectValidationOptions, connectValidate } from './connect-parser.js';

export type ConnectTapeOptions = ConnectValidationOptions & {
  chunks: Array<TapeChunk<ConnectFlags>>;
  exitCode?: number;
  /** Keep the shell running until killed for the branches this predicate matches. */
  pendingWhen?: (flags: ConnectFlags) => boolean;
};

/** Build a connect tape, wiring connect-specific validation into the generic `validate` hook. */
export function connectTape(options: ConnectTapeOptions): Tape<ConnectFlags> {
  return {
    chunks: options.chunks,
    exitCode: options.exitCode ?? 0,
    pendingWhen: options.pendingWhen,
    validate: connectValidate({
      requireKeyless: options.requireKeyless,
      requireNoKeyless: options.requireNoKeyless,
      allowedChannels: options.allowedChannels,
    }),
  };
}

/** Default keyless Slack tape used by the canonical scenario. */
export function buildDefaultTape(overrides?: Partial<ConnectTapeOptions>): Tape<ConnectFlags> {
  const defaultChunks: Array<TapeChunk<ConnectFlags>> = [
    { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/abc123' },
    { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
    { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/authorize/xyz' },
    {
      stdout: [
        '✓ Your agent is live.',
        '  Agent: Demo Agent (demo-agent-1)',
        '  → Check Slack — your agent just messaged you.',
        '  Claim your agent: https://dashboard.novu.test/claim/token-abc',
      ].join('\n'),
    },
  ];

  return connectTape({
    chunks: overrides?.chunks ?? defaultChunks,
    exitCode: overrides?.exitCode ?? 0,
    // The default tape models the keyless flow, so require `--keyless` unless the caller
    // explicitly opts into the dashboard-OAuth (no-keyless) path.
    requireKeyless: overrides?.requireKeyless ?? !overrides?.requireNoKeyless,
    allowedChannels: overrides?.allowedChannels ?? ['slack'],
    requireNoKeyless: overrides?.requireNoKeyless,
  });
}
