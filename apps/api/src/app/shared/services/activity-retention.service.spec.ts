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
  let originalNodeEnv: typeof process.env.NODE_ENV;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    originalIsSelfHosted = process.env.IS_SELF_HOSTED;
    originalNodeEnv = process.env.NODE_ENV;

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
    process.env.NODE_ENV = originalNodeEnv;
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

  it('accepts a daylight-saving week when the server clock is later than the client stamp', async () => {
    const clientNow = new Date('2026-10-30T12:00:00.000Z');
    const hourMs = 60 * 60 * 1000;
    const weekMs = 7 * 24 * hourMs;
    const after = new Date(clientNow.getTime() - weekMs - hourMs);
    const serverNow = new Date(clientNow.getTime() + 5 * 1000);

    sandbox.useFakeTimers(serverNow);
    stubOrganization(ApiServiceLevelEnum.PRO);

    const range = await service.resolve({
      organizationId: 'org-123',
      after: after.toISOString(),
      before: clientNow.toISOString(),
    });

    expect(range.after).to.equal(after.toISOString());
  });

  it('rejects a start past the daylight-saving buffer and request delay', async () => {
    const serverNow = new Date('2026-10-30T12:00:05.000Z');
    const hourMs = 60 * 60 * 1000;
    const weekMs = 7 * 24 * hourMs;
    const requestDelayMs = 60 * 1000;
    const rejectedAfter = new Date(serverNow.getTime() - weekMs - hourMs - requestDelayMs - 1);

    sandbox.useFakeTimers(serverNow);
    stubOrganization(ApiServiceLevelEnum.PRO);

    try {
      await service.resolve({
        organizationId: 'org-123',
        after: rejectedAfter.toISOString(),
        before: serverNow.toISOString(),
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

  describe('resolveAfter', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date('2026-11-26T12:00:00.000Z');

    it('defaults to the start of the retention window', async () => {
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.PRO);

      expect(await service.resolveAfter({ organizationId: 'org-123' })).to.equal(
        new Date(now.getTime() - 7 * dayMs).toISOString()
      );
    });

    it('accepts a start ahead of the server clock, since no end date is implied', async () => {
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.PRO);
      const ahead = new Date(now.getTime() + 5 * 1000).toISOString();

      expect(await service.resolveAfter({ organizationId: 'org-123', after: ahead })).to.equal(ahead);
    });

    it('rejects a start older than the window with 402', async () => {
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.PRO);

      try {
        await service.resolveAfter({
          organizationId: 'org-123',
          after: new Date(now.getTime() - 8 * dayMs).toISOString(),
        });
        expect.fail('Expected the start to exceed retention');
      } catch (error) {
        expect(error).to.be.instanceOf(HttpException);
        expect((error as HttpException).getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
        expect((error as HttpException).message).to.contain(
          "Requested date range exceeds your plan's retention period"
        );
      }
    });

    it('leaves the start unbounded when self-hosted', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      stubOrganization(ApiServiceLevelEnum.FREE);

      expect(await service.resolveAfter({ organizationId: 'org-123' })).to.equal(undefined);
      expect(await service.resolveAfter({ organizationId: 'org-123', after: '2020-01-01T00:00:00.000Z' })).to.equal(
        '2020-01-01T00:00:00.000Z'
      );
    });
  });

  describe('assertWithinRetention', () => {
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    const requestDelayMs = 60 * 1000;
    const now = new Date('2026-11-26T12:00:00.000Z');

    async function expectPaymentRequired(createdAt: Date) {
      try {
        await service.assertWithinRetention({ organizationId: 'org-123', createdAt });
        expect.fail('Expected the record to be outside retention');
      } catch (error) {
        expect(error).to.be.instanceOf(HttpException);
        expect((error as HttpException).getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
        expect((error as HttpException).message).to.contain('The earliest accessible date for your plan is 2026-11-19');
      }
    }

    it('allows a record inside the window, including the daylight-saving buffer and request delay', async () => {
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.PRO);

      await service.assertWithinRetention({ organizationId: 'org-123', createdAt: now });
      await service.assertWithinRetention({
        organizationId: 'org-123',
        createdAt: new Date(now.getTime() - 7 * dayMs - hourMs - requestDelayMs),
      });
    });

    it('rejects a record older than the window with 402', async () => {
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.PRO);

      await expectPaymentRequired(new Date(now.getTime() - 7 * dayMs - hourMs - requestDelayMs - 1));
    });

    it('keeps every record readable when self-hosted', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.FREE);

      await service.assertWithinRetention({ organizationId: 'org-123', createdAt: new Date('2020-01-01') });
    });

    it('keeps every record readable in local development', async () => {
      process.env.NODE_ENV = 'local';
      sandbox.useFakeTimers(now);
      stubOrganization(ApiServiceLevelEnum.FREE);

      await service.assertWithinRetention({ organizationId: 'org-123', createdAt: new Date('2020-01-01') });
    });
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
