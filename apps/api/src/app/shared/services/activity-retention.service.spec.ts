import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ActivityRetentionService } from './activity-retention.service';

describe('ActivityRetentionService', () => {
  let service: ActivityRetentionService;
  let organizationRepository: CommunityOrganizationRepository;
  let sandbox: sinon.SinonSandbox;
  let originalIsSelfHosted: string | undefined;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    originalIsSelfHosted = process.env.IS_SELF_HOSTED;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityRetentionService,
        {
          provide: CommunityOrganizationRepository,
          useValue: { findById: () => undefined },
        },
      ],
    }).compile();

    service = moduleRef.get(ActivityRetentionService);
    organizationRepository = moduleRef.get(CommunityOrganizationRepository);
  });

  afterEach(() => {
    sandbox.restore();
    process.env.IS_SELF_HOSTED = originalIsSelfHosted;
  });

  function stubOrganization(apiServiceLevel: ApiServiceLevelEnum, createdAt = new Date('2025-03-01')) {
    sandbox.stub(organizationRepository, 'findById').resolves({
      _id: 'org-123',
      name: 'Test organization',
      apiServiceLevel,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    } as OrganizationEntity);
  }

  it('defaults a limited organization to its full retention window', async () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    sandbox.useFakeTimers(now);
    stubOrganization(ApiServiceLevelEnum.BUSINESS);

    const range = await service.resolve({ organizationId: 'org-123' });

    expect(range).to.deep.equal({
      after: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      before: now.toISOString(),
    });
  });

  it('allows the team retention boundary and rejects dates beyond it', async () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    sandbox.useFakeTimers(now);
    stubOrganization(ApiServiceLevelEnum.BUSINESS);

    const allowedAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const allowed = await service.resolve({
      organizationId: 'org-123',
      after: allowedAfter.toISOString(),
      before: now.toISOString(),
    });

    expect(allowed.after).to.equal(allowedAfter.toISOString());

    const rejectedAfter = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);

    try {
      await service.resolve({
        organizationId: 'org-123',
        after: rejectedAfter.toISOString(),
        before: now.toISOString(),
      });
      expect.fail('Expected the range to exceed retention');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
    }
  });

  it('preserves the 30-day legacy free retention policy', async () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    sandbox.useFakeTimers(now);
    stubOrganization(ApiServiceLevelEnum.FREE, new Date('2024-01-01'));

    const range = await service.resolve({ organizationId: 'org-123' });

    expect(range.after).to.equal(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
  });

  it('keeps self-hosted ranges unbounded when dates are omitted', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    stubOrganization(ApiServiceLevelEnum.FREE);

    const range = await service.resolve({ organizationId: 'org-123' });

    expect(range).to.deep.equal({ after: undefined, before: undefined });
  });

  it('rejects invalid and reversed dates at the shared boundary', async () => {
    stubOrganization(ApiServiceLevelEnum.BUSINESS);

    for (const request of [
      { after: 'not-a-date' },
      { after: '2026-09-24T13:00:00.000Z', before: '2026-09-24T12:00:00.000Z' },
    ]) {
      try {
        await service.resolve({ organizationId: 'org-123', ...request });
        expect.fail('Expected an invalid range');
      } catch (error) {
        expect(error).to.be.instanceOf(HttpException);
        expect((error as HttpException).getStatus()).to.equal(HttpStatus.BAD_REQUEST);
      }
    }
  });
});
