import { describe, expect, it } from 'vitest';
import {
  buildNovuHumanRequestId,
  isNovuHumanToolName,
  isNovuInternalToolName,
  NOVU_HUMAN_SCHEMA,
  parseNovuHumanRequestId,
} from './novu-internal-tools';

describe('novu_human correlation', () => {
  it('round-trips sessionId and toolUseId', () => {
    const requestId = buildNovuHumanRequestId('ses_abc', 'sevt_tool');

    expect(requestId).toBe('novu_human:ses_abc:sevt_tool');
    expect(parseNovuHumanRequestId(requestId)).toEqual({
      sessionId: 'ses_abc',
      toolUseId: 'sevt_tool',
    });
  });

  it('returns null for framework request ids and malformed values', () => {
    expect(parseNovuHumanRequestId('hr_1')).toBeNull();
    expect(parseNovuHumanRequestId('novu_human:')).toBeNull();
    expect(parseNovuHumanRequestId('novu_human:ses_only')).toBeNull();
    expect(parseNovuHumanRequestId(undefined)).toBeNull();
  });

  it('treats novu_human as an internal platform tool', () => {
    expect(isNovuHumanToolName(NOVU_HUMAN_SCHEMA.name)).toBe(true);
    expect(isNovuInternalToolName('novu_human')).toBe(true);
    expect(isNovuHumanToolName('novu_resolve')).toBe(false);
  });
});
