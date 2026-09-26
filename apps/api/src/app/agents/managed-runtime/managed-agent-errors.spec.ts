import { expect } from 'chai';
import {
  buildErrorMessage,
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

  describe('buildErrorMessage', () => {
    it('returns actionable copy for the skills/read misconfiguration', () => {
      expect(buildErrorMessage(new Error(anthropicSkillsReadError))).to.equal(MISSING_READ_TOOL_FOR_SKILLS_REPLY);
    });
  });
});
