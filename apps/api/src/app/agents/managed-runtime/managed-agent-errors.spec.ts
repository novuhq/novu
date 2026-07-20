import { expect } from 'chai';
import {
  buildErrorMessage,
  extractErrorMessage,
  extractNotFoundVaultId,
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

  describe('extractNotFoundVaultId', () => {
    const anthropicVaultNotFoundError =
      '404 {"type":"error","error":{"type":"not_found_error","message":"vault vlt_011CdBB7PqywiEejNVEFwXu1 not found"},"request_id":"req_011CdBxzGXMefDxyqhYQ3mYK"}';

    it('extracts the vault id from Error instances', () => {
      expect(extractNotFoundVaultId(new Error(anthropicVaultNotFoundError))).to.equal('vlt_011CdBB7PqywiEejNVEFwXu1');
    });

    it('extracts the vault id from JSON-serialized webhook error objects', () => {
      expect(
        extractNotFoundVaultId({
          name: 'ThalamusError',
          message: 'vault vlt_abc123 not found',
        })
      ).to.equal('vlt_abc123');
    });

    it('returns undefined for unrelated errors', () => {
      expect(extractNotFoundVaultId(new Error('rate limited'))).to.equal(undefined);
      expect(extractNotFoundVaultId(new Error('agent agent_01ABC not found'))).to.equal(undefined);
      expect(extractNotFoundVaultId(null)).to.equal(undefined);
    });
  });

  describe('extractErrorMessage', () => {
    it('reads message from Error and plain objects', () => {
      expect(extractErrorMessage(new Error('boom'))).to.equal('boom');
      expect(extractErrorMessage({ message: 'plain' })).to.equal('plain');
    });
  });

  describe('buildErrorMessage', () => {
    it('returns actionable copy for the skills/read misconfiguration', () => {
      expect(buildErrorMessage(new Error(anthropicSkillsReadError))).to.equal(MISSING_READ_TOOL_FOR_SKILLS_REPLY);
    });
  });
});
