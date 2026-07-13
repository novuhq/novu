import { UnauthorizedException } from '@nestjs/common';
import { ApiAuthSchemeEnum, MemberRoleEnum, ROLE_PERMISSIONS, UserSessionData } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

describe('ClerkOAuthStrategy', () => {
  let eeAuth: any;

  try {
    eeAuth = require('@novu/ee-auth');
  } catch (error) {
    return;
  }

  const { ClerkOAuthStrategy } = eeAuth;

  let strategy: any;
  let mockEnvironmentRepository: { findOne: sinon.SinonStub };
  let mockLinkEntitiesService: { linkInternalExternalEntities: sinon.SinonStub };
  let mockLogger: { setContext: sinon.SinonStub; info: sinon.SinonStub; warn: sinon.SinonStub };
  let mockClerkClient: {
    authenticateRequest: sinon.SinonStub;
    users: { getOrganizationMembershipList: sinon.SinonStub };
  };

  const mockRequest = {
    authScheme: ApiAuthSchemeEnum.OAUTH2,
    headers: {
      authorization: 'Bearer oat_test_token',
    },
  };

  const buildMembership = (organizationId = 'clerk-org-123') => ({
    organization: { id: organizationId },
    role: MemberRoleEnum.OWNER,
    publicUserData: {
      identifier: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://example.com/profile.png',
    },
  });

  let originalIssuerUrl: string | undefined;

  const validEnvironmentId = '507f1f77bcf86cd799439011';
  const alternateEnvironmentId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    originalIssuerUrl = process.env.CLERK_ISSUER_URL;
    delete process.env.CLERK_ISSUER_URL;

    mockEnvironmentRepository = {
      findOne: sinon.stub().resolves({ _id: validEnvironmentId }),
    };

    mockLinkEntitiesService = {
      linkInternalExternalEntities: sinon.stub().resolves({
        internalUserId: 'internal-user-123',
        internalOrgId: 'internal-org-123',
      }),
    };

    mockLogger = {
      setContext: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
    };

    mockClerkClient = {
      authenticateRequest: sinon.stub().resolves({
        isAuthenticated: true,
        toAuth: () => ({
          tokenType: 'oauth_token',
          userId: 'clerk-user-123',
          clientId: 'client-123',
          scopes: ['user:org:read'],
        }),
      }),
      users: {
        getOrganizationMembershipList: sinon.stub().resolves({ data: [buildMembership()] }),
      },
    };

    strategy = new ClerkOAuthStrategy(mockEnvironmentRepository, mockLinkEntitiesService, mockLogger, mockClerkClient);
  });

  afterEach(() => {
    if (originalIssuerUrl === undefined) {
      delete process.env.CLERK_ISSUER_URL;
    } else {
      process.env.CLERK_ISSUER_URL = originalIssuerUrl;
    }
    sinon.restore();
  });

  describe('validate', () => {
    it('should transform a valid OAuth token into a user session with member-role permissions', async () => {
      const result: UserSessionData = await strategy.validate(mockRequest);

      expect(result).to.deep.include({
        _id: 'internal-user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organizationId: 'internal-org-123',
        roles: [MemberRoleEnum.OWNER],
        permissions: ROLE_PERMISSIONS[MemberRoleEnum.OWNER],
        environmentId: validEnvironmentId,
        scheme: ApiAuthSchemeEnum.OAUTH2,
      });
    });

    it('should link internal/external entities using the Clerk user and org ids', async () => {
      await strategy.validate(mockRequest);

      expect(
        mockLinkEntitiesService.linkInternalExternalEntities.calledOnceWith(mockRequest, {
          _id: 'clerk-user-123',
          email: 'john@example.com',
          org_id: 'clerk-org-123',
        })
      ).to.be.true;
    });

    it('should resolve the Development environment for the organization', async () => {
      await strategy.validate(mockRequest);

      expect(
        mockEnvironmentRepository.findOne.calledOnceWith(
          {
            _organizationId: 'internal-org-123',
            name: 'Development',
          },
          '_id'
        )
      ).to.be.true;
    });

    it('should throw UnauthorizedException when the token is not authenticated', async () => {
      mockClerkClient.authenticateRequest.resolves({ isAuthenticated: false, toAuth: () => null });

      try {
        await strategy.validate(mockRequest);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
      }
    });

    it('should throw UnauthorizedException when the authorization header is missing', async () => {
      try {
        await strategy.validate({ authScheme: ApiAuthSchemeEnum.OAUTH2, headers: {} });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
      }
    });

    it('should return false when the request was not routed through the OAuth2 scheme', async () => {
      const keylessRoutedRequest = {
        authScheme: ApiAuthSchemeEnum.KEYLESS,
        headers: {
          authorization: 'Bearer oat_test_token',
          'novu-application-identifier': 'pk_keyless_invalid',
        },
      };

      const result = await strategy.validate(keylessRoutedRequest);

      expect(result).to.be.false;
      expect(mockClerkClient.authenticateRequest.called).to.be.false;
    });

    it('should throw UnauthorizedException when the user has no organization membership', async () => {
      mockClerkClient.users.getOrganizationMembershipList.resolves({ data: [] });

      try {
        await strategy.validate(mockRequest);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
      }
    });

    it('should throw UnauthorizedException when the user belongs to multiple organizations without a consent-selected org', async () => {
      mockClerkClient.users.getOrganizationMembershipList.resolves({
        data: [buildMembership('clerk-org-a'), buildMembership('clerk-org-b')],
      });

      try {
        await strategy.validate(mockRequest);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
      }
    });

    it('should use the consent-selected organization (userinfo org_id) when the user belongs to multiple organizations', async () => {
      process.env.CLERK_ISSUER_URL = 'https://example.clerk.accounts.dev';
      mockClerkClient.users.getOrganizationMembershipList.resolves({
        data: [buildMembership('clerk-org-a'), buildMembership('clerk-org-b')],
      });
      mockLinkEntitiesService.linkInternalExternalEntities.resolves({
        internalUserId: 'internal-user-123',
        internalOrgId: 'internal-org-b',
      });
      sinon.stub(globalThis, 'fetch').resolves({
        ok: true,
        json: async () => ({ org_id: 'clerk-org-b' }),
      } as Response);

      await strategy.validate(mockRequest);

      expect(
        mockLinkEntitiesService.linkInternalExternalEntities.calledOnceWith(mockRequest, {
          _id: 'clerk-user-123',
          email: 'john@example.com',
          org_id: 'clerk-org-b',
        })
      ).to.be.true;
    });

    it('should throw UnauthorizedException when the consent-selected org is not a membership', async () => {
      process.env.CLERK_ISSUER_URL = 'https://example.clerk.accounts.dev';
      mockClerkClient.users.getOrganizationMembershipList.resolves({
        data: [buildMembership('clerk-org-a')],
      });
      sinon.stub(globalThis, 'fetch').resolves({
        ok: true,
        json: async () => ({ org_id: 'clerk-org-unknown' }),
      } as Response);

      try {
        await strategy.validate(mockRequest);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
      }
    });

    it('should respect the Novu-Environment-Id header when it belongs to the organization', async () => {
      mockEnvironmentRepository.findOne.resolves({ _id: alternateEnvironmentId });

      const result: UserSessionData = await strategy.validate({
        authScheme: ApiAuthSchemeEnum.OAUTH2,
        headers: {
          authorization: 'Bearer oat_test_token',
          'novu-environment-id': alternateEnvironmentId,
        },
      });

      expect(result.environmentId).to.equal(alternateEnvironmentId);
      expect(
        mockEnvironmentRepository.findOne.calledOnceWith(
          {
            _id: alternateEnvironmentId,
            _organizationId: 'internal-org-123',
          },
          '_id'
        )
      ).to.be.true;
    });

    it('should throw UnauthorizedException when the Novu-Environment-Id header is not a valid ObjectId', async () => {
      try {
        await strategy.validate({
          authScheme: ApiAuthSchemeEnum.OAUTH2,
          headers: {
            authorization: 'Bearer oat_test_token',
            'novu-environment-id': 'WSf5vSEijeZt',
          },
        });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
        expect(err.message).to.equal('Invalid environment identifier');
        expect(mockEnvironmentRepository.findOne.called).to.equal(false);
      }
    });

    it('should throw UnauthorizedException when the Novu-Environment-Id header does not belong to the organization', async () => {
      mockEnvironmentRepository.findOne.resolves(null);

      try {
        await strategy.validate({
          authScheme: ApiAuthSchemeEnum.OAUTH2,
          headers: {
            authorization: 'Bearer oat_test_token',
            'novu-environment-id': alternateEnvironmentId,
          },
        });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
        expect(err.message).to.equal('Cannot find environment for the provided Novu-Environment-Id header');
      }

      expect(mockEnvironmentRepository.findOne.calledOnce).to.be.true;
    });

    it('should throw UnauthorizedException when the Development environment is not found', async () => {
      mockEnvironmentRepository.findOne.resolves(null);

      try {
        await strategy.validate(mockRequest);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
        expect(err.message).to.equal('Cannot find environment');
      }
    });
  });
});
