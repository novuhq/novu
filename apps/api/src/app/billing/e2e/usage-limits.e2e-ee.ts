import { CommunityOrganizationRepository } from '@novu/dal';
import { GetStripeSubscription, StripeSubscriptionSlice } from '@novu/ee-billing';
import {
  ALL_PERMISSIONS,
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  IOrganizationUsageLimits,
  MemberRoleEnum,
  PermissionsEnum,
  UpdateUsageLimitsDto,
  UsageAlertRecipientsEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

const USAGE_LIMITS_PATH = '/v1/billing/usage-limits';
const USAGE_LIMITS_FLAG = FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED;

const DEFAULT_USAGE_LIMITS: UpdateUsageLimitsDto = {
  workflowRuns: { headroom: null, pauseAtLimit: false },
  alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
};

const PAUSING_USAGE_LIMITS: UpdateUsageLimitsDto = {
  workflowRuns: { headroom: 10_000, pauseAtLimit: true },
  alerts: { enabled: false, sendTo: UsageAlertRecipientsEnum.ALL_MEMBERS },
};

describe('Usage limits #novu-v2', () => {
  const organizationRepository = new CommunityOrganizationRepository();
  let session: UserSession;
  let getStripeSubscriptionStub: sinon.SinonStub;
  let restoreEnv: () => void;

  const givenIncludedEvents = (includedEvents: number | null) => {
    const subscription: StripeSubscriptionSlice = {
      includedEvents,
      currentPeriodStart: '2024-04-05T00:00:00.000Z',
      currentPeriodEnd: '2024-05-05T00:00:00.000Z',
      status: 'active',
      trialStart: null,
      trialEnd: null,
      cancelAt: null,
      hasPaymentMethod: true,
      billingInterval: 'month',
      skip: null,
    };
    getStripeSubscriptionStub.resolves(subscription);
  };

  const putUsageLimits = (body: object) => session.testAgent.put(USAGE_LIMITS_PATH).send(body);

  const deleteUsageLimits = () => session.testAgent.delete(USAGE_LIMITS_PATH);

  const findStoredUsageLimits = async () =>
    (await organizationRepository.findById(session.organization._id, 'usageLimits'))?.usageLimits;

  const expectStored = async (settings: UpdateUsageLimitsDto) => {
    const { updatedAt, ...storedSettings }: IOrganizationUsageLimits = (await findStoredUsageLimits()) ?? {};

    expect(storedSettings).to.deep.equal(settings);
    expect(updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  };

  beforeEach(async () => {
    restoreEnv = overrideEnv({ [USAGE_LIMITS_FLAG]: 'true', IS_RBAC_ENABLED: 'true' });
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);

    // BillingModule is imported by more than one module, so every instance must see the stub.
    getStripeSubscriptionStub = sinon.stub(GetStripeSubscription.prototype, 'execute');
    givenIncludedEvents(30_000);
  });

  afterEach(() => {
    getStripeSubscriptionStub.restore();
    restoreEnv();
  });

  describe('PUT /v1/billing/usage-limits', () => {
    it('should store and return the settings of a Pro organization', async () => {
      const response = await putUsageLimits(PAUSING_USAGE_LIMITS);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(PAUSING_USAGE_LIMITS);
      await expectStored(PAUSING_USAGE_LIMITS);
    });

    it('should store and return the settings of a Business organization', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
      givenIncludedEvents(250_000);
      const settings: UpdateUsageLimitsDto = {
        workflowRuns: { headroom: 50_000, pauseAtLimit: false },
        alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
      };

      const response = await putUsageLimits(settings);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(settings);
      await expectStored(settings);
    });

    it('should replace every previously stored setting', async () => {
      const settings: UpdateUsageLimitsDto = {
        workflowRuns: { headroom: null, pauseAtLimit: false },
        alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ALL_MEMBERS },
      };
      await putUsageLimits(PAUSING_USAGE_LIMITS).expect(200);

      const response = await putUsageLimits(settings);

      expect(response.status).to.equal(200);
      await expectStored(settings);
    });

    for (const headroom of [0, 1_000_000_000]) {
      it(`should accept a headroom of ${headroom}`, async () => {
        const settings: UpdateUsageLimitsDto = {
          ...PAUSING_USAGE_LIMITS,
          workflowRuns: { headroom, pauseAtLimit: true },
        };

        const response = await putUsageLimits(settings);

        expect(response.status).to.equal(200);
        expect(response.body.data).to.deep.equal(settings);
      });
    }

    it('should reject the request when usage limits are disabled', async () => {
      process.env[USAGE_LIMITS_FLAG] = 'false';

      const response = await putUsageLimits(PAUSING_USAGE_LIMITS);

      expect(response.status).to.equal(403);
      expect(await findStoredUsageLimits()).to.equal(undefined);
    });

    const ineligibleOrganizations: Array<{ title: string; arrange: () => Promise<void> }> = [
      {
        title: 'a Free organization',
        arrange: async () => {
          await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
          givenIncludedEvents(10_000);
        },
      },
      {
        title: 'an Enterprise organization',
        arrange: async () => {
          await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.ENTERPRISE);
          givenIncludedEvents(5_000_000);
        },
      },
      {
        title: 'a Pro trial organization',
        arrange: async () => {
          await organizationRepository.update({ _id: session.organization._id }, { isTrial: true });
        },
      },
      {
        title: 'a Pro organization without included events',
        arrange: async () => {
          givenIncludedEvents(null);
        },
      },
    ];

    for (const { title, arrange } of ineligibleOrganizations) {
      it(`should require payment for ${title}`, async () => {
        await arrange();

        const response = await putUsageLimits(PAUSING_USAGE_LIMITS);

        expect(response.status).to.equal(402);
        expect(await findStoredUsageLimits()).to.equal(undefined);
      });
    }

    const invalidBodies: Array<{ title: string; body: object }> = [
      {
        title: 'a negative headroom',
        body: { ...PAUSING_USAGE_LIMITS, workflowRuns: { headroom: -1, pauseAtLimit: true } },
      },
      {
        title: 'a fractional headroom',
        body: { ...PAUSING_USAGE_LIMITS, workflowRuns: { headroom: 1.5, pauseAtLimit: true } },
      },
      {
        title: 'a string headroom',
        body: { ...PAUSING_USAGE_LIMITS, workflowRuns: { headroom: '1000', pauseAtLimit: true } },
      },
      {
        title: 'a headroom above 1,000,000,000',
        body: { ...PAUSING_USAGE_LIMITS, workflowRuns: { headroom: 1_000_000_001, pauseAtLimit: true } },
      },
      {
        title: 'unknown alert recipients',
        body: { ...PAUSING_USAGE_LIMITS, alerts: { enabled: true, sendTo: 'owners' } },
      },
      {
        title: 'missing alerts',
        body: { workflowRuns: PAUSING_USAGE_LIMITS.workflowRuns },
      },
      {
        title: 'pause at limit without a headroom',
        body: { ...PAUSING_USAGE_LIMITS, workflowRuns: { headroom: null, pauseAtLimit: true } },
      },
    ];

    for (const { title, body } of invalidBodies) {
      it(`should reject ${title}`, async () => {
        const response = await putUsageLimits(body);

        expect(response.status).to.equal(422);
        expect(await findStoredUsageLimits()).to.equal(undefined);
      });
    }
  });

  describe('DELETE /v1/billing/usage-limits', () => {
    it('should remove the stored settings and return the defaults', async () => {
      await putUsageLimits(PAUSING_USAGE_LIMITS).expect(200);
      await expectStored(PAUSING_USAGE_LIMITS);

      const response = await deleteUsageLimits();

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(DEFAULT_USAGE_LIMITS);
      expect(await findStoredUsageLimits()).to.equal(undefined);
    });

    it('should return the defaults when no settings are stored', async () => {
      const response = await deleteUsageLimits();

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(DEFAULT_USAGE_LIMITS);
      expect(await findStoredUsageLimits()).to.equal(undefined);
    });

    it('should reject the request when usage limits are disabled', async () => {
      await organizationRepository.updateUsageLimits(session.organization._id, PAUSING_USAGE_LIMITS);
      process.env[USAGE_LIMITS_FLAG] = 'false';

      const response = await deleteUsageLimits();

      expect(response.status).to.equal(403);
      expect(await findStoredUsageLimits()).to.deep.equal(PAUSING_USAGE_LIMITS);
    });
  });

  describe('Without the billing write permission', () => {
    const expectMissingBillingWrite = (response: Awaited<ReturnType<typeof deleteUsageLimits>>) => {
      expect(response.status).to.equal(403);
      expect(response.body.message).to.include('Insufficient permissions');
      expect(response.body.message).to.include(PermissionsEnum.BILLING_WRITE);
    };

    beforeEach(async () => {
      // Permissions are only enforced on tiers with role-based access control
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
      givenIncludedEvents(250_000);
      await organizationRepository.updateUsageLimits(session.organization._id, PAUSING_USAGE_LIMITS);
      await session.updateEETokenClaims({
        org_role: MemberRoleEnum.ADMIN,
        org_permissions: ALL_PERMISSIONS.filter((permission) => permission !== PermissionsEnum.BILLING_WRITE),
      });
    });

    it('should reject updating the settings', async () => {
      expectMissingBillingWrite(await putUsageLimits(DEFAULT_USAGE_LIMITS));
      expect(await findStoredUsageLimits()).to.deep.equal(PAUSING_USAGE_LIMITS);
    });

    it('should reject resetting the settings', async () => {
      expectMissingBillingWrite(await deleteUsageLimits());
      expect(await findStoredUsageLimits()).to.deep.equal(PAUSING_USAGE_LIMITS);
    });
  });
});

function overrideEnv(values: Record<string, string>): () => void {
  const previousValues = Object.keys(values).map((key) => [key, process.env[key]] as const);
  Object.assign(process.env, values);

  return () => {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}
