import { ArgumentMetadata } from '@nestjs/common';
import { ApiAuthSchemeEnum, MemberRoleEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { expect } from 'chai';

import { encodeBase62 } from '../utils/base62';
import { ParseSlugEnvironmentIdPipe } from './parse-slug-env-id.pipe';

describe('ParseSlugEnvironmentIdPipe', () => {
  let pipe: ParseSlugEnvironmentIdPipe;

  beforeEach(() => {
    pipe = new ParseSlugEnvironmentIdPipe();
  });

  function createUserSession(environmentId: string): UserSessionData {
    return {
      environmentId,
      _id: 'user-id',
      organizationId: 'org-id',
      roles: [],
      permissions: [],
      scheme: ApiAuthSchemeEnum.BEARER,
    };
  }

  describe('MongoDB ObjectIds', () => {
    it('should return MongoDB ObjectIds unchanged', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const userSession = createUserSession(internalId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });

    it('should handle ObjectIds with leading zeros', () => {
      const internalId = '0615943e7ace93b0540ae377';
      const userSession = createUserSession(internalId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });
  });

  describe('Short environment identifiers', () => {
    it('should return short environment identifiers unchanged', () => {
      const identifier = 'production';
      const userSession = createUserSession(identifier);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(identifier);
    });

    it('should return development environment identifiers unchanged', () => {
      const identifier = 'development';
      const userSession = createUserSession(identifier);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(identifier);
    });

    it('should return staging environment identifiers unchanged', () => {
      const identifier = 'staging';
      const userSession = createUserSession(identifier);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(identifier);
    });

    it('should handle environment identifiers exactly at length boundary', () => {
      const identifier = 'my-environment-1'; // 16 characters
      const userSession = createUserSession(identifier);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(identifier);
    });
  });

  describe('Environment slug IDs', () => {
    it('should decode production environment slug IDs', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const slugId = `production_env_${encodedId}`;
      const userSession = createUserSession(slugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });

    it('should decode development environment slug IDs', () => {
      const internalId = '507f1f77bcf86cd799439011';
      const encodedId = encodeBase62(internalId);
      const slugId = `development_env_${encodedId}`;
      const userSession = createUserSession(slugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });

    it('should decode staging environment slug IDs', () => {
      const internalId = '507f191e810c19729de860ea';
      const encodedId = encodeBase62(internalId);
      const slugId = `staging-env_stg_${encodedId}`;
      const userSession = createUserSession(slugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });

    it('should decode environment slug IDs with any prefix format', () => {
      const internalId = '65f1234567890abcdef12345';
      const encodedId = encodeBase62(internalId);
      const slugId = `custom-environment_custom_${encodedId}`;
      const userSession = createUserSession(slugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });
  });

  describe('Environment IDs with leading zeros in slug format', () => {
    it('should handle decoded environment IDs with leading zeros', () => {
      const internalIds = ['6615943e7ace93b0540ae377', '0615943e7ace93b0540ae377', '0015943e7ace93b0540ae377'];

      internalIds.forEach((internalId) => {
        const encodedId = encodeBase62(internalId);
        const slugId = `env_prefix_${encodedId}`;
        const userSession = createUserSession(slugId);
        const result = pipe.transform(userSession, {} as ArgumentMetadata);
        expect(result.environmentId).to.equal(internalId);
      });
    });
  });

  describe('Invalid or malformed inputs', () => {
    it('should return invalid encoded environment IDs unchanged', () => {
      const invalidEncodedId = 'invalidEncoding123';
      const envSlug = `my-env_env_${invalidEncodedId}`;
      const userSession = createUserSession(envSlug);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(envSlug);
    });

    it('should return malformed environment slug IDs unchanged', () => {
      const malformedSlugId = 'environment_bad_encoding123';
      const userSession = createUserSession(malformedSlugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(malformedSlugId);
    });

    it('should handle empty environment IDs', () => {
      const userSession = createUserSession('');
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal('');
    });
  });

  describe('User session preservation', () => {
    it('should preserve all other user session properties', () => {
      const originalSession: UserSessionData = {
        environmentId: 'production_env_1A2B3C4D5E6F7890',
        _id: 'user-123',
        organizationId: 'org-456',
        roles: [MemberRoleEnum.ADMIN, MemberRoleEnum.AUTHOR],
        permissions: [PermissionsEnum.WORKFLOW_READ, PermissionsEnum.WORKFLOW_WRITE],
        scheme: ApiAuthSchemeEnum.BEARER,
      };

      const result = pipe.transform(originalSession, {} as ArgumentMetadata);

      expect(result._id).to.equal(originalSession._id);
      expect(result.organizationId).to.equal(originalSession.organizationId);
      expect(result.roles).to.deep.equal(originalSession.roles);
      expect(result.permissions).to.deep.equal(originalSession.permissions);
      expect(result.scheme).to.equal(originalSession.scheme);
      // environmentId should be transformed, but others should remain the same
    });

    it('should only transform the environmentId property', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const slugId = `production_env_${encodedId}`;

      const originalSession = createUserSession(slugId);
      const result = pipe.transform(originalSession, {} as ArgumentMetadata);

      expect(result.environmentId).to.equal(internalId);
      expect(result._id).to.equal(originalSession._id);
      expect(result.organizationId).to.equal(originalSession.organizationId);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long environment names in slug format', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const longEnvName = 'very-long-environment-name-that-exceeds-normal-length';
      const slugId = `${longEnvName}_env_${encodedId}`;

      const userSession = createUserSession(slugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });

    it('should handle environment names with special characters', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const specialEnvName = 'env-with-dashes_and_underscores';
      const slugId = `${specialEnvName}_env_${encodedId}`;

      const userSession = createUserSession(slugId);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });
  });
});
