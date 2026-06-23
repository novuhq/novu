import { describe, expect, it } from 'vitest';
import { type ConnectFlags, connectParser, connectValidate } from './connect-parser.js';
import { buildDefaultTape } from './tape.js';

const baseFlags: ConnectFlags = { keyless: true, secretKey: false, ci: true, channel: 'slack' };

describe('connectParser', () => {
  it('strips quotes from --channel values', () => {
    const flags = connectParser.parse('npx novu@latest connect "Wine concierge" --ci --keyless --channel "slack"', {});

    expect(flags.channel).toBe('slack');
  });

  it('parses a positional description that follows flags', () => {
    const flags = connectParser.parse(
      'npx novu@latest connect --ci --keyless --channel slack "Wine staff concierge"',
      {}
    );

    expect(flags.description).toBe('Wine staff concierge');
    expect(flags.channel).toBe('slack');
  });

  it('parses a positional description that precedes flags', () => {
    const flags = connectParser.parse('npx novu connect "Wine concierge" --ci --channel slack', {});

    expect(flags.description).toBe('Wine concierge');
  });

  it('handles the embedded-apostrophe idiom in a positional description', () => {
    const flags = connectParser.parse(`npx novu connect 'Bob'\\''s wine helper' --ci --channel slack`, {});

    expect(flags.description).toBe("Bob's wine helper");
  });

  it('resolves a $NOVU_AGENT_DESCRIPTION positional from env', () => {
    const flags = connectParser.parse('npx novu connect "$NOVU_AGENT_DESCRIPTION" --ci --keyless --channel slack', {
      NOVU_AGENT_DESCRIPTION: 'Wine staff concierge',
    });

    expect(flags.description).toBe('Wine staff concierge');
  });

  it('reads --slack-config-token without surrounding quotes', () => {
    const flags = connectParser.parse('npx novu connect --ci --channel slack --slack-config-token "xoxe.test"', {});

    expect(flags.slackConfigToken).toBe('xoxe.test');
  });
});

describe('connectValidate', () => {
  it('requires a channel when allowedChannels is set', () => {
    const error = connectValidate({ allowedChannels: ['slack'] })({ ...baseFlags, channel: undefined });

    expect(error).toMatch(/Expected --channel/);
  });

  it('rejects a channel outside the allow list', () => {
    const error = connectValidate({ allowedChannels: ['slack'] })({ ...baseFlags, channel: 'email' });

    expect(error).toMatch(/Unexpected channel/);
  });

  it('passes a valid keyless command', () => {
    expect(connectValidate({ allowedChannels: ['slack'], requireKeyless: true })(baseFlags)).toBeNull();
  });
});

describe('buildDefaultTape', () => {
  it('requires --keyless by default', () => {
    const tape = buildDefaultTape({ allowedChannels: ['slack'] });

    expect(tape.validate?.({ ...baseFlags, keyless: false })).toMatch(/--keyless/);
    expect(tape.validate?.({ ...baseFlags, keyless: true })).toBeNull();
  });

  it('does not require --keyless when requireNoKeyless is set', () => {
    const tape = buildDefaultTape({ allowedChannels: ['slack'], requireNoKeyless: true });

    expect(tape.validate?.({ ...baseFlags, keyless: false })).toBeNull();
  });
});
