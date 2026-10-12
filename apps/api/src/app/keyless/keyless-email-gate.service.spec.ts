import { ForbiddenException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE, KeylessEmailGateService } from './keyless-email-gate.service';

describe('KeylessEmailGateService', () => {
  const keylessOrgId = 'keyless-org';
  let previousKeylessOrgId: string | undefined;
  let previousDashboardUrl: string | undefined;

  beforeEach(() => {
    previousKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;
    previousDashboardUrl = process.env.HUMAN_DASHBOARD_URL;
    process.env.KEYLESS_ORGANIZATION_ID = keylessOrgId;
    process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md';
  });

  afterEach(() => {
    restoreEnv('KEYLESS_ORGANIZATION_ID', previousKeylessOrgId);
    restoreEnv('HUMAN_DASHBOARD_URL', previousDashboardUrl);
  });

  function service(overrides?: { issue?: sinon.SinonStub; operator?: Record<string, unknown> | null }) {
    const connectClaimTokenService = {
      issueOrGetForEnvironment: overrides?.issue ?? sinon.stub().resolves({ token: 'claim-token' }),
    };
    const humanContactRepository = {
      findOperator: sinon.stub().resolves(
        overrides && 'operator' in overrides
          ? overrides.operator
          : {
              subscriberId: 'sub-1',
              addresses: {
                [HumanChannelViaEnum.EMAIL]: { declared: { address: 'ada@example.com', declaredAt: 't' } },
              },
            }
      ),
    };

    return {
      gate: new KeylessEmailGateService(connectClaimTokenService as never, humanContactRepository as never),
      connectClaimTokenService,
      humanContactRepository,
    };
  }

  it('does not throw for an organization that is not keyless', async () => {
    const { gate, connectClaimTokenService } = service();

    await gate.assertAllowed({ environmentId: 'env1', organizationId: 'real-org' });

    expect(gate.isBlocked('real-org')).to.equal(false);
    expect(connectClaimTokenService.issueOrGetForEnvironment.called).to.equal(false);
  });

  it('throws a claim body with a signup link when the organization is keyless', async () => {
    const { gate } = service();

    try {
      await gate.assertAllowed({ environmentId: 'env1', organizationId: keylessOrgId });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
      const body = (err as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(body).to.include({
        code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE,
        browserLogin: true,
      });
      expect(String(body.claimUrl)).to.include('/claim');
      expect(String(body.claimUrl)).to.include('token=claim-token');
      expect(body.message).to.be.a('string');
    }
  });

  it('still throws when the claim token cannot be issued, without a link', async () => {
    const { gate } = service({ issue: sinon.stub().rejects(new Error('redis down')) });

    try {
      await gate.assertAllowed({ environmentId: 'env1', organizationId: keylessOrgId });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
      const body = (err as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(body.code).to.equal(KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE);
      expect(body).to.not.have.property('claimUrl');
    }
  });

  describe('assertOperatorVerificationAllowed', () => {
    const verification = {
      environmentId: 'env1',
      organizationId: keylessOrgId,
      agentId: 'agent1',
      subscriberId: 'sub-1',
      address: 'Ada@Example.com',
    };

    it('returns nothing for an organization that is not keyless', async () => {
      const { gate, humanContactRepository } = service();

      expect(
        await gate.assertOperatorVerificationAllowed({ ...verification, organizationId: 'real-org' })
      ).to.deep.equal({});
      expect(humanContactRepository.findOperator.called).to.equal(false);
    });

    it('lets a keyless operator verify their declared address and returns the claim link', async () => {
      const { gate } = service();

      const result = await gate.assertOperatorVerificationAllowed(verification);

      expect(result.claimUrl).to.include('token=claim-token');
    });

    it('allows the verification without a claim link when no token can be issued', async () => {
      const { gate } = service({ issue: sinon.stub().rejects(new Error('redis down')) });

      expect(await gate.assertOperatorVerificationAllowed(verification)).to.deep.equal({});
    });

    it('refuses another address or another contact', async () => {
      for (const params of [
        { ...verification, address: 'someone@example.com' },
        { ...verification, subscriberId: 'sub-2' },
      ]) {
        const { gate } = service();

        try {
          await gate.assertOperatorVerificationAllowed(params);
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.be.instanceOf(ForbiddenException);
        }
      }
    });
  });

  it('reads the operator declared address and builds the claim card', async () => {
    const { gate } = service();

    expect(await gate.findDeclaredOperatorAddress('env1', 'agent1')).to.equal('ada@example.com');

    const card = gate.buildClaimCard('https://gethuman.md/claim?token=claim-token');
    expect(JSON.stringify(card)).to.include('Sign up free');
    expect(JSON.stringify(card)).to.include('https://gethuman.md/claim?token=claim-token');
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}
