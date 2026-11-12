import { expect } from 'chai';
import {
  buildErrorMessage,
  CONTENT_FLAGGED_REPLY,
  isContentFlaggedError,
  isMissingReadToolForSkillsError,
  MISSING_READ_TOOL_FOR_SKILLS_REPLY,
} from './managed-agent-errors';

describe('managed-agent-errors', () => {
  const anthropicSkillsReadError =
    '400 {"type":"error","error":{"type":"invalid_request_error","message":"Missing required tool: skills require the read tool to be usable (enabled and not always_deny) on the session\'s `agent_toolset`"}}';

  describe('isMissingReadToolForSkillsError', () => {
    it('matches Error instances with the Anthropic skills/read message', () => {
      expect(isMissingReadToolForSkillsError(new Error(anthropicSkillsReadError))).to.equal(true);
    });

    it('matches JSON-serialized webhook error objects', () => {
      expect(
        isMissingReadToolForSkillsError({
          name: 'ThalamusError',
          message: 'Missing required tool: skills require the read tool to be usable',
        })
      ).to.equal(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isMissingReadToolForSkillsError(new Error('rate limited'))).to.equal(false);
      expect(isMissingReadToolForSkillsError({ message: 123 })).to.equal(false);
      expect(isMissingReadToolForSkillsError(null)).to.equal(false);
    });
  });

  describe('isContentFlaggedError', () => {
    it('matches the moderation violation message', () => {
      expect(isContentFlaggedError(new Error('Content flagged as inappropriate.'))).to.equal(true);
      expect(isContentFlaggedError({ message: 'Content flagged as inappropriate.' })).to.equal(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isContentFlaggedError(new Error('rate limited'))).to.equal(false);
      expect(isContentFlaggedError(undefined)).to.equal(false);
    });
  });

  describe('buildErrorMessage', () => {
    it('asks the user to rephrase when the content is flagged', () => {
      expect(buildErrorMessage(new Error('Content flagged as inappropriate.'))).to.equal(CONTENT_FLAGGED_REPLY);
    });

    it('falls back to the generic copy for unknown errors', () => {
      expect(buildErrorMessage(new Error('boom'))).to.equal(
        'The agent is temporarily unavailable. Please try again later.'
      );
    });

    it('returns actionable copy for the skills/read misconfiguration', () => {
      expect(buildErrorMessage(new Error(anthropicSkillsReadError))).to.equal(MISSING_READ_TOOL_FOR_SKILLS_REPLY);
    });
  });
});
