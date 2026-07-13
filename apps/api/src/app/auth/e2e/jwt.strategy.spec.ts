import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AuthService } from '../services/auth.service';
import { JwtStrategy } from '../services/passport/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockAuthService: { validateUser: sinon.SinonStub };
  let mockEnvironmentRepository: { findOne: sinon.SinonStub };

  const validEnvironmentId = '507f1f77bcf86cd799439011';

  const mockSession: UserSessionData = {
    _id: 'user-123',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    organizationId: 'org-123',
    roles: [],
    permissions: [],
    scheme: ApiAuthSchemeEnum.BEARER,
    environmentId: validEnvironmentId,
  };

  beforeEach(async () => {
    mockAuthService = {
      validateUser: sinon.stub().resolves(mockSession),
    };
    mockEnvironmentRepository = {
      findOne: sinon.stub().resolves({ _id: validEnvironmentId }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: EnvironmentRepository, useValue: mockEnvironmentRepository },
      ],
    }).compile();

    strategy = moduleRef.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should reject invalid environment identifiers before querying MongoDB', async () => {
      const request = {
        headers: {
          [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()]: 'WSf5vSEijeZt',
        },
      };

      try {
        await strategy.validate(request as never, { ...mockSession });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedException);
        expect(err.message).to.equal('Invalid environment identifier');
        expect(mockEnvironmentRepository.findOne.called).to.equal(false);
      }
    });
  });
});
