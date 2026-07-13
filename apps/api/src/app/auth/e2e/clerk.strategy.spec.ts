import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { ALL_PERMISSIONS, ApiAuthSchemeEnum, MemberRoleEnum, UserSessionData } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

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

  const validEnvironmentId = '507f1f77bcf86cd799439011';

  const mockRequest = {
    headers: {
      [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()]: validEnvironmentId,
    },
  };

  const mockPayload: Partial<typeof ClerkJwtPayload> = {
    _id: 'clerk-user-123',
    org_id: 'clerk-org-123',
    firstName: 'John',
    lastName: 'Doe',
    profilePicture: 'https://example.com/profile.png',
    email: 'john@example.com',
    org_role: MemberRoleEnum.OWNER,
    org_permissions: ALL_PERMISSIONS,
    externalId: undefined,
    externalOrgId: undefined,
  };

  beforeEach(async () => {
    mockEnvironmentRepository = {
      findOne: sinon.stub().resolves({ _id: validEnvironmentId }),
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
        roles: [MemberRoleEnum.OWNER],
        permissions: ALL_PERMISSIONS,
        environmentId: validEnvironmentId,
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
            _id: validEnvironmentId,
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

    it('should throw UnauthorizedException when environment id is not a valid ObjectId', async () => {
      const requestWithInvalidEnvironmentId = {
        headers: {
          [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()]: 'WSf5vSEijeZt',
        },
      };

      try {
        await strategy.validate(requestWithInvalidEnvironmentId, mockPayload);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
        expect(err.message).to.equal('Invalid environment identifier');
        expect(mockEnvironmentRepository.findOne.called).to.equal(false);
      }
    });
  });
});
