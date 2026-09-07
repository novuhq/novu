import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FeatureFlagsService, PinoLogger, TraceLogRepository } from '@novu/application-generic';
import { CommunityOrganizationRepository, NotificationRepository, SubscriberRepository } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetActivityFeed } from './get-activity-feed.usecase';

describe('GetActivityFeed - validateRetentionLimitForTier', () => {
  let useCase: GetActivityFeed;
  let organizationRepository: CommunityOrganizationRepository;
  let sandbox: sinon.SinonSandbox;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetActivityFeed,
        SubscriberRepository,
        NotificationRepository,
        {
          provide: CommunityOrganizationRepository,
          useValue: {
            findById: () => {},
          },
        },
        {
          provide: TraceLogRepository,
          useValue: {
            createStepRun: () => {},
          },
        },
        {
          provide: FeatureFlagsService,
          useValue: {
            getFlag: () => Promise.resolve({ value: false }),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            info: () => {},
            error: () => {},
            warn: () => {},
            debug: () => {},
            trace: () => {},
            setContext: () => {},
          },
        },
      ],
    }).compile();

    useCase = moduleRef.get<GetActivityFeed>(GetActivityFeed);
    organizationRepository = moduleRef.get(CommunityOrganizationRepository);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Date handling', () => {
    it('should default to maximum allowed retention period when no dates provided', async () => {
      const now = new Date();
      sandbox.useFakeTimers(now.getTime());

      const mockOrg = {
        _id: 'org-123',
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        createdAt: new Date('2024-01-01'),
      };

      sandbox.stub(organizationRepository, 'findById').resolves(mockOrg as any);

      const result = await (useCase as any).validateRetentionLimitForTier('org-123');
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      expect(new Date(result.after).getTime()).to.be.approximately(sevenDaysAgo.getTime(), 1000); // allowing 1s difference
      expect(result.before).to.equal(now.toISOString());
    });

    it('should use provided dates when within retention period', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockOrg = {
        _id: 'org-123',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        createdAt: new Date('2024-01-01'),
      };

      sandbox.stub(organizationRepository, 'findById').resolves(mockOrg as any);

      const result = await (useCase as any).validateRetentionLimitForTier(
        'org-123',
        twoDaysAgo.toISOString(),
        now.toISOString()
      );

      expect(result.after).to.equal(twoDaysAgo.toISOString());
      expect(result.before).to.equal(now.toISOString());
    });

    it('should reject when after date is later than before date', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const mockOrg = {
        _id: 'org-123',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        createdAt: new Date('2024-01-01'),
      };

      sandbox.stub(organizationRepository, 'findById').resolves(mockOrg as any);

      try {
        await (useCase as any).validateRetentionLimitForTier('org-123', tomorrow.toISOString(), now.toISOString());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(HttpException);
        expect(error.message).to.match(/Invalid date range/);
        expect(error.status).to.equal(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('Retention periods by tier', () => {
    const testCases = [
      {
        tier: 'Legacy Free',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        createdAt: new Date('2024-01-01'),
        allowedDays: 30,
        rejectedDays: 31,
      },
      {
        tier: 'New Free',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        createdAt: new Date('2025-03-01'),
        allowedDays: 1,
        rejectedDays: 2,
      },
      {
        tier: 'Pro',
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        createdAt: new Date(),
        allowedDays: 7,
        rejectedDays: 8,
      },
      {
        tier: 'Team',
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        createdAt: new Date(),
        allowedDays: 90,
        rejectedDays: 91,
      },
    ];

    testCases.forEach(({ tier, apiServiceLevel, createdAt, allowedDays, rejectedDays }) => {
      describe(tier, () => {
        it(`should allow access within ${allowedDays} days`, async () => {
          const now = new Date();
          const withinPeriod = new Date(now.getTime() - allowedDays * 24 * 60 * 60 * 1000);

          const mockOrg = {
            _id: 'org-123',
            apiServiceLevel,
            createdAt,
          };

          sandbox.stub(organizationRepository, 'findById').resolves(mockOrg as any);

          const result = await (useCase as any).validateRetentionLimitForTier(
            'org-123',
            withinPeriod.toISOString(),
            now.toISOString()
          );

          expect(result.after).to.equal(withinPeriod.toISOString());
          expect(result.before).to.equal(now.toISOString());
        });

        it(`should reject access beyond ${rejectedDays} days`, async () => {
          const now = new Date();
          const beyondPeriod = new Date(now.getTime() - rejectedDays * 24 * 60 * 60 * 1000);

          const mockOrg = {
            _id: 'org-123',
            apiServiceLevel,
            createdAt,
          };

          sandbox.stub(organizationRepository, 'findById').resolves(mockOrg as any);

          try {
            await (useCase as any).validateRetentionLimitForTier(
              'org-123',
              beyondPeriod.toISOString(),
              now.toISOString()
            );
            expect.fail('Should have thrown an error');
          } catch (error) {
            expect(error).to.be.instanceOf(HttpException);
            console.log(error.message);
            expect(error.message).to.match(/retention period/);
            expect(error.status).to.equal(HttpStatus.PAYMENT_REQUIRED);
          }
        });
      });
    });
  });
});
