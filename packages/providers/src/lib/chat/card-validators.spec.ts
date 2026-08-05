import { ChatProviderIdEnum } from '@novu/shared';
import { CardElement } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { getChatCardValidator } from './card-validators';

const cardWithBlocks = (blockCount: number): CardElement => ({
  type: 'card',
  children: Array.from({ length: blockCount }, () => ({ type: 'divider' as const })),
});

describe('getChatCardValidator', () => {
  test('returns the Slack validator, which flags over-limit block counts', () => {
    const validate = getChatCardValidator(ChatProviderIdEnum.Slack);

    expect(validate).toBeDefined();
    const findings = validate?.(cardWithBlocks(51)) ?? [];
    expect(findings.map((finding) => finding.code)).toContain('BLOCK_LIMIT_EXCEEDED');
  });

  test('returns the MS Teams validator', () => {
    const validate = getChatCardValidator(ChatProviderIdEnum.MsTeams);

    expect(validate).toBeDefined();
    expect(validate?.(cardWithBlocks(1))).toEqual([]);
  });

  test('returns validators for every rich provider (Slack, Teams, Telegram, WhatsApp)', () => {
    expect(getChatCardValidator(ChatProviderIdEnum.Slack)).toBeDefined();
    expect(getChatCardValidator(ChatProviderIdEnum.MsTeams)).toBeDefined();
    expect(getChatCardValidator(ChatProviderIdEnum.Telegram)).toBeDefined();
    expect(getChatCardValidator(ChatProviderIdEnum.WhatsAppBusiness)).toBeDefined();
  });

  test('returns undefined for markdown-fallback providers and unknown ids', () => {
    expect(getChatCardValidator(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getChatCardValidator('not-a-provider')).toBeUndefined();
  });
});
