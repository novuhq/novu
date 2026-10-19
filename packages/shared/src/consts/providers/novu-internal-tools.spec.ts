import { describe, expect, it } from 'vitest';
import {
  buildNovuHumanRequestId,
  buildToolApprovalRequestId,
  isNovuHumanToolName,
  isNovuInternalToolName,
  NOVU_HUMAN_SCHEMA,
  parseNovuHumanRequestId,
  parseToolApprovalRequestId,
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

  it('round-trips tool-approval request ids', () => {
    expect(buildToolApprovalRequestId('apr_1')).toBe('tool_approval:apr_1');
    expect(parseToolApprovalRequestId('tool_approval:apr_1')).toBe('apr_1');
    expect(parseToolApprovalRequestId('tool_approval:')).toBeNull();
    expect(parseToolApprovalRequestId('hr_1')).toBeNull();
  });

  it('treats novu_human as an internal platform tool', () => {
    expect(isNovuHumanToolName(NOVU_HUMAN_SCHEMA.name)).toBe(true);
    expect(isNovuInternalToolName('novu_human')).toBe(true);
    expect(isNovuHumanToolName('novu_resolve')).toBe(false);
  });

  it('documents card.icon as Slack-only catalog id or URL', () => {
    expect(NOVU_HUMAN_SCHEMA.input_schema.properties.card.properties.icon.description).toMatch(/Slack only/);
    expect(NOVU_HUMAN_SCHEMA.input_schema.properties.card.properties.icon.description).toMatch(/stripe/);
  });

  it('requires card.title and has no top-level prompt or options', () => {
    expect(NOVU_HUMAN_SCHEMA.input_schema.required).toEqual(['kind', 'card']);
    expect(NOVU_HUMAN_SCHEMA.input_schema.properties.card.required).toEqual(['title']);
    expect(NOVU_HUMAN_SCHEMA.input_schema.properties).not.toHaveProperty('prompt');
    expect(NOVU_HUMAN_SCHEMA.input_schema.properties).not.toHaveProperty('options');
  });
});
