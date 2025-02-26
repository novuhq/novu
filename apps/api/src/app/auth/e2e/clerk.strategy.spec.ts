/* eslint-disable global-require */
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { EnvironmentRepository } from '@novu/dal';
import sinon from 'sinon';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { UnauthorizedException } from '@nestjs/common';

describe('ClerkStrategy', () => {
  let eeAuth: any;

  try {
    eeAuth = require('@novu/ee-auth');
  } catch (error) {
    return;
  }

  const { ClerkStrategy, LinkEntitiesService, ClerkJwtPayload } = eeAuth;

  let strategy: typeof ClerkStrategy;
  let mockEnvironmentRepository: { findOne: sinon.SinonStub };
  let mockLinkEntitiesService: { linkInternalExternalEntities: sinon.SinonStub };

  const mockRequest = {
    headers: {
      [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()]: 'env-123',
    },
  };

  const mockPayload: Partial<typeof ClerkJwtPayload> = {
    _id: 'clerk-user-123',
    org_id: 'clerk-org-123',
    firstName: 'John',
    lastName: 'Doe',
    profilePicture: 'https://example.com/profile.png',
    email: 'john@example.com',
    org_role: 'org:admin',
    externalId: undefined,
    externalOrgId: undefined,
  };

  beforeEach(async () => {
    mockEnvironmentRepository = {
      findOne: sinon.stub().resolves({ _id: 'env-123' }),
    };

    mockLinkEntitiesService = {
      linkInternalExternalEntities: sinon.stub().resolves({
        internalUserId: 'internal-user-123',
        internalOrgId: 'internal-org-123',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClerkStrategy,
        { provide: EnvironmentRepository, useValue: mockEnvironmentRepository },
        { provide: LinkEntitiesService, useValue: mockLinkEntitiesService },
      ],
    }).compile();

    strategy = moduleRef.get<typeof ClerkStrategy>(ClerkStrategy);
  });

  describe('validate', () => {
    it('should transform Clerk payload into valid user session', async () => {
      const result: UserSessionData = await strategy.validate(mockRequest, mockPayload);

      expect(result).to.deep.include({
        _id: 'internal-user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organizationId: 'internal-org-123',
        roles: ['admin'],
        environmentId: 'env-123',
        scheme: ApiAuthSchemeEnum.BEARER,
      });
    });

    it('should call linkInternalExternalEntities with correct parameters', async () => {
      await strategy.validate(mockRequest, mockPayload);

      expect(mockLinkEntitiesService.linkInternalExternalEntities.calledOnceWith(mockRequest, mockPayload)).to.be.true;
    });

    it('should verify environment access', async () => {
      await strategy.validate(mockRequest, mockPayload);

      expect(
        mockEnvironmentRepository.findOne.calledOnceWith(
          {
            _id: 'env-123',
            _organizationId: 'internal-org-123',
          },
          '_id'
        )
      ).to.be.true;
    });

    it('should throw UnauthorizedException when environment is not found', async () => {
      mockEnvironmentRepository.findOne.resolves(null);

      try {
        await strategy.validate(mockRequest, mockPayload);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
        expect(err.message).to.equal('Cannot find environment');
      }
    });
  });
});
