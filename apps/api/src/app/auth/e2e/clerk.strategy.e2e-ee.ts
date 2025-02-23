import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { EnvironmentRepository } from '@novu/dal';
import sinon from 'sinon';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ClerkStrategy, LinkEntitiesService, ClerkJwtPayload } from '@novu/ee-auth';
import { UnauthorizedException } from '@nestjs/common';

describe('ClerkStrategy Flow #novu-v2', () => {
  let strategy: ClerkStrategy;
  let mockEnvironmentRepository: { findOne: sinon.SinonStub };
  let mockLinkEntitiesService: { linkInternalExternalEntities: sinon.SinonStub };

  beforeEach(async () => {
    mockEnvironmentRepository = {
      findOne: sinon.stub().resolves({ _id: 'env-123' }),
    };

    mockLinkEntitiesService = {
      // creates a new user and organization in the database
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

    strategy = moduleRef.get<ClerkStrategy>(ClerkStrategy);
  });

  it('should follow the complete strategy flow', async () => {
    const mockRequest = {
      headers: {
        [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()]: 'env-123',
      },
    };

    // decoded payload of the JWT token
    const mockPayload: Partial<ClerkJwtPayload> = {
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

    /**
     * Validate and transform the Clerk JWT payload into a UserSessionData object.
     * This process includes:
     * 1. Validating the JWT payload structure
     * 2. Linking internal (MongoDB) and external (Clerk) entities (tested separately - linkEntitiesService)
     * 3. Transforming the data into our internal user session format
     */
    const result: UserSessionData = await strategy.validate(mockRequest as any, mockPayload as any);

    // Verify validatePayload was effective
    expect(result._id).to.equal('internal-user-123');

    // Verify linkInternalExternalEntities was called
    expect(mockLinkEntitiesService.linkInternalExternalEntities.calledWith(mockRequest, mockPayload)).to.be.true;

    // Verify environment check was performed
    expect(
      mockEnvironmentRepository.findOne.calledWith(
        {
          _id: 'env-123',
          _organizationId: 'internal-org-123',
        },
        '_id'
      )
    ).to.be.true;

    // Verify final session structure
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

  it('should fail if environment validation fails', async () => {
    mockEnvironmentRepository.findOne = sinon.stub().resolves(null);

    const mockRequest = {
      headers: {
        [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()]: 'invalid-env',
      },
    };

    const mockPayload = {
      _id: 'clerk-user-123',
      org_id: 'clerk-org-123',
    };

    try {
      await strategy.validate(mockRequest as any, mockPayload as any);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).to.be.instanceOf(UnauthorizedException);
      expect(error.message).to.equal('Cannot find environment');
    }
  });
});
