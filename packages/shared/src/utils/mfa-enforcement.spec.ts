import { describe, expect, it } from 'vitest';
import {
  isMfaEnforcementBlocking,
  readMfaEnforcementFromSessionClaims,
  readOrgRequireMfa,
  resolveMfaEnforcementState,
} from './mfa-enforcement';

describe('mfa-enforcement utils', () => {
  describe('readOrgRequireMfa', () => {
    it('returns false when metadata is missing', () => {
      expect(readOrgRequireMfa(undefined)).toBe(false);
    });

    it('returns true when requireMfa is set', () => {
      expect(readOrgRequireMfa({ requireMfa: true })).toBe(true);
    });
  });

  describe('readMfaEnforcementFromSessionClaims', () => {
    it('reads requireMfa and isMfaEnabled from session claims', () => {
      expect(readMfaEnforcementFromSessionClaims({ requireMfa: true, isMfaEnabled: true })).toEqual({
        requireMfa: true,
        isMfaEnabled: true,
      });
    });
  });

  describe('isMfaEnforcementBlocking', () => {
    it('blocks when MFA is required but not enabled', () => {
      expect(isMfaEnforcementBlocking(true, false)).toBe(true);
    });

    it('does not block when MFA is not required', () => {
      expect(isMfaEnforcementBlocking(false, false)).toBe(false);
    });
  });

  describe('resolveMfaEnforcementState', () => {
    it('falls back to organization metadata and user two-factor state', () => {
      expect(
        resolveMfaEnforcementState({
          sessionClaims: {},
          organizationPublicMetadata: { requireMfa: true },
          userTwoFactorEnabled: false,
        })
      ).toEqual({
        requireMfa: true,
        isMfaEnabled: false,
        isBlocked: true,
      });
    });
  });
});
