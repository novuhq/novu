import { CommunityOrganizationRepository } from '@novu/dal';
import { GetStripeSubscription } from '@novu/ee-billing';
import {
  ALL_PERMISSIONS,
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  IOrganizationUsageLimits,
  MemberRoleEnum,
  PermissionsEnum,
  UsageAlertRecipientsEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { buildStripeSubscription, PAUSING_USAGE_LIMITS, useEnvironment } from './billing-e2e.helpers';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

const USAGE_LIMITS_PATH = '/v1/billing/usage-limits';
const USAGE_LIMITS_FLAG = FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED;

const DEFAULT_USAGE_LIMITS: IOrganizationUsageLimits = {
  workflowRuns: { onDemandLimit: null },
  pauseAtLimit: false,
  alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
};

describe('Usage limits #novu-v2', () => {
  const organizationRepository = new CommunityOrganizationRepository();
  let session: UserSession;
  let getStripeSubscriptionStub: sinon.SinonStub;

  const givenIncludedEvents = (includedEvents: number | null) => {
    getStripeSubscriptionStub.resolves(buildStripeSubscription(includedEvents));
  };

  const putUsageLimits = (body: object) => session.testAgent.put(USAGE_LIMITS_PATH).send(body);

  const deleteUsageLimits = () => session.testAgent.delete(USAGE_LIMITS_PATH);

  const findStoredUsageLimits = async () =>
    (await organizationRepository.findById(session.organization._id, 'usageLimits'))?.usageLimits;

  useEnvironment({ [USAGE_LIMITS_FLAG]: 'true', IS_RBAC_ENABLED: 'true' });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);

    // BillingModule is imported by more than one module, so every instance must see the stub.
    getStripeSubscriptionStub = sinon.stub(GetStripeSubscription.prototype, 'execute');
    givenIncludedEvents(30_000);
  });

  describe('PUT /v1/billing/usage-limits', () => {
    it('should store and return the settings of a Pro organization', async () => {
      const response = await putUsageLimits(PAUSING_USAGE_LIMITS);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(PAUSING_USAGE_LIMITS);
      expect(await findStoredUsageLimits()).to.deep.equal(PAUSING_USAGE_LIMITS);
    });

    it('should store and return the settings of a Business organization', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
      givenIncludedEvents(250_000);
      const settings: IOrganizationUsageLimits = {
        workflowRuns: { onDemandLimit: 50_000 },
        pauseAtLimit: false,
        alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
      };

      const response = await putUsageLimits(settings);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(settings);
      expect(await findStoredUsageLimits()).to.deep.equal(settings);
    });

    it('should replace every previously stored setting', async () => {
      const settings: IOrganizationUsageLimits = {
        workflowRuns: { onDemandLimit: null },
        pauseAtLimit: false,
        alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ALL_MEMBERS },
      };
      await putUsageLimits(PAUSING_USAGE_LIMITS).expect(200);

      const response = await putUsageLimits(settings);

      expect(response.status).to.equal(200);
      expect(await findStoredUsageLimits()).to.deep.equal(settings);
    });

    it('should store pausing at the included events without an on-demand limit', async () => {
      const settings: IOrganizationUsageLimits = {
        ...PAUSING_USAGE_LIMITS,
        workflowRuns: { onDemandLimit: null },
      };

      const response = await putUsageLimits(settings);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.deep.equal(settings);
      expect(await findStoredUsageLimits()).to.deep.equal(settings);
    });

    it('should reject the request when usage limits are disabled', async () => {
      process.env[USAGE_LIMITS_FLAG] = 'false';

      const response = await putUsageLimits(PAUSING_USAGE_LIMITS);

      expect(response.status).to.equal(403);
      expect(await findStoredUsageLimits()).to.equal(undefined);
    });

    it('should require payment for a plan that cannot configure usage limits', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
      givenIncludedEvents(10_000);

      const response = await putUsageLimits(PAUSING_USAGE_LIMITS);

      expect(response.status).to.equal(402);
      expect(await findStoredUsageLimits()).to.equal(undefined);
    });

    it('should reject an invalid body', async () => {
      const response = await putUsageLimits({
        ...PAUSING_USAGE_LIMITS,
        workflowRuns: { onDemandLimit: -1 },
      });

      expect(response.status).to.equal(422);
      expect(await findStoredUsageLimits()).to.equal(undefined);
    });
  });

  describe('DELETE /v1/billing/usage-limits', () => {
    it('should remove the stored settings and return the defaults', async () => {
      await putUsageLimits(PAUSING_USAGE_LIMITS).expect(200);
      expect(await findStoredUsageLimits()).to.deep.equal(PAUSING_USAGE_LIMITS);

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
