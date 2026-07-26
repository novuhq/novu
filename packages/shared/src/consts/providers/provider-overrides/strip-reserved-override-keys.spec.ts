import { describe, expect, it } from 'vitest';
import { ChatProviderIdEnum, ToolProviderIdEnum } from '../../../types';
import { getProviderOverrideConfig, stripReservedOverrideKeys } from './provider-override-registry';
import { NON_OVERRIDABLE_SLACK_KEYS, SLACK_OVERRIDE_KEYS } from './slack/keys';

describe('stripReservedOverrideKeys', () => {
  it('removes the routing and credential keys Novu owns from a Slack override', () => {
    const stripped = stripReservedOverrideKeys(ChatProviderIdEnum.Slack, {
      channel: 'C_ATTACKER',
      token: 'xoxb-stolen',
      as_user: true,
      text: 'hello',
      blocks: [{ type: 'divider' }],
    });

    expect(stripped).toEqual({ text: 'hello', blocks: [{ type: 'divider' }] });
  });

  it('leaves _passthrough alone, since it is the deliberate door for raw provider fields', () => {
    const stripped = stripReservedOverrideKeys(ChatProviderIdEnum.Slack, {
      channel: 'C_ATTACKER',
      _passthrough: { body: { channel: 'C_DELIBERATE' } },
    });

    expect(stripped).toEqual({ _passthrough: { body: { channel: 'C_DELIBERATE' } } });
  });

  it('returns the original object when nothing is reserved, so the send path does not copy needlessly', () => {
    const override = { text: 'hello' };

    expect(stripReservedOverrideKeys(ChatProviderIdEnum.Slack, override)).toBe(override);
  });

  it('does not mutate the override it was given', () => {
    const override = { channel: 'C_ATTACKER', text: 'hello' };

    stripReservedOverrideKeys(ChatProviderIdEnum.Slack, override);

    expect(override.channel).toBe('C_ATTACKER');
  });

  it('passes through providers that reserve nothing, including escape hatches', () => {
    const discord = { content: 'hi', channel: 'anything' };
    const pagerduty = { summary: 'boom' };

    expect(stripReservedOverrideKeys(ChatProviderIdEnum.Discord, discord)).toBe(discord);
    expect(stripReservedOverrideKeys(ToolProviderIdEnum.PagerDuty, pagerduty)).toBe(pagerduty);
    expect(stripReservedOverrideKeys('not-a-provider', discord)).toBe(discord);
  });

  it('reserves exactly the Slack keys that are absent from the overridable key list', () => {
    const config = getProviderOverrideConfig(ChatProviderIdEnum.Slack);

    expect(config?.reservedKeys).toEqual(NON_OVERRIDABLE_SLACK_KEYS);
    for (const reserved of NON_OVERRIDABLE_SLACK_KEYS) {
      expect(SLACK_OVERRIDE_KEYS).not.toContain(reserved);
    }
  });
});
