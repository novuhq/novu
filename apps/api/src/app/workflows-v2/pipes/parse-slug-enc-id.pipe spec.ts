import { expect } from 'chai';
import { ArgumentMetadata } from '@nestjs/common';
import { UserSessionData, ApiAuthSchemeEnum } from '@novu/shared';

import { encodeBase62 } from '../../shared/helpers';
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

  it('should return the original value for non-slug environment IDs', () => {
    const userSession = createUserSession('non-slug-id');
    const result = pipe.transform(userSession, {} as ArgumentMetadata);
    expect(result.environmentId).to.equal('non-slug-id');
  });

  it('should handle invalid encoded environment IDs', () => {
    const invalidEncodedId = encodeBase62('invalidEncoding');
    const envSlug = `my-env_${invalidEncodedId}`;
    const userSession = createUserSession(envSlug);
    const result = pipe.transform(userSession, {} as ArgumentMetadata);
    expect(result.environmentId).to.equal(envSlug);
  });

  it('should not trim or decode internal environment ID', () => {
    const internalId = '6615943e7ace93b0540ae377';
    const userSession = createUserSession(internalId);
    const result = pipe.transform(userSession, {} as ArgumentMetadata);
    expect(result.environmentId).to.equal(internalId);
  });

  it('should not trim or decode simple environment identifier', () => {
    const identifier = 'my-environment-1'; // 16 characters
    const userSession = createUserSession(identifier);
    const result = pipe.transform(userSession, {} as ArgumentMetadata);
    expect(result.environmentId).to.equal(identifier);
  });

  it('should handle slug environment IDs without known prefixes', () => {
    const internalId = '6615943e7ace93b0540ae377';
    const encodedId = encodeBase62(internalId);
    const userSession = createUserSession(`my-env_${encodedId}`);
    const result = pipe.transform(userSession, {} as ArgumentMetadata);
    expect(result.environmentId).to.equal(internalId);
  });

  it('should handle environment IDs with leading zeros', () => {
    const internalIds = ['6615943e7ace93b0540ae377', '0615943e7ace93b0540ae377', '0015943e7ace93b0540ae377'];

    internalIds.forEach((internalId) => {
      const encodedId = encodeBase62(internalId);
      const userSession = createUserSession(`my-env_${encodedId}`);
      const result = pipe.transform(userSession, {} as ArgumentMetadata);
      expect(result.environmentId).to.equal(internalId);
    });
  });
});
