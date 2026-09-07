import { BadRequestException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import * as dnsProviderModule from '../../utils/dns-provider';
import { CreateDomain } from './create-domain.usecase';

describe('CreateDomain usecase', () => {
  const previousEnv = { ...process.env };

  const baseCommand = {
    name: 'inbound.example.com',
    environmentId: 'env-id',
    organizationId: 'org-id',
    userId: 'user-id',
  };

  let domainRepositoryMock: { findByName: sinon.SinonStub; create: sinon.SinonStub; count: sinon.SinonStub };
  let resourceValidatorMock: {
    validateDomainsLimit: sinon.SinonStub;
    validateCustomEmailDomainsLimit: sinon.SinonStub;
  };

  function buildUsecase() {
    return new CreateDomain(domainRepositoryMock as any, resourceValidatorMock as any);
  }

  beforeEach(() => {
    process.env.MAIL_SERVER_DOMAIN = 'mail.novu.co';

    domainRepositoryMock = {
      findByName: stub().resolves(null),
      create: stub().callsFake((doc: Record<string, unknown>) => Promise.resolve({ _id: 'domain-id', ...doc })),
      count: stub().resolves(0),
    };

    resourceValidatorMock = {
      validateDomainsLimit: stub().resolves(),
      validateCustomEmailDomainsLimit: stub().resolves(),
    };

    stub(dnsProviderModule, 'detectDnsProvider').resolves(null);
  });

  afterEach(() => {
    restore();
    process.env = { ...previousEnv };
  });

  describe('custom email domain limit', () => {
    it('propagates limit errors from the resource validator without creating the domain', async () => {
      resourceValidatorMock.validateCustomEmailDomainsLimit.rejects(
        new HttpException({ message: 'Upgrade your plan', currentCount: 3, limit: 3 }, HttpStatus.PAYMENT_REQUIRED)
      );

      const usecase = buildUsecase();

      try {
        await usecase.execute(baseCommand);
        throw new Error('Expected execute to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(HttpException);
        expect((err as HttpException).getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
      }

      expect(resourceValidatorMock.validateDomainsLimit.called).to.equal(false);
      expect(domainRepositoryMock.create.called).to.equal(false);
    });

    it('validates the plan entitlement before the global anti-abuse cap', async () => {
      const usecase = buildUsecase();

      await usecase.execute(baseCommand);

      expect(resourceValidatorMock.validateCustomEmailDomainsLimit.calledOnceWith(baseCommand.organizationId)).to.equal(
        true
      );
      expect(resourceValidatorMock.validateDomainsLimit.calledOnceWith(baseCommand.organizationId)).to.equal(true);
      expect(
        resourceValidatorMock.validateCustomEmailDomainsLimit.calledBefore(resourceValidatorMock.validateDomainsLimit)
      ).to.equal(true);
      expect(domainRepositoryMock.create.calledOnce).to.equal(true);
    });
  });

  describe('shared agent domain reservation', () => {
    beforeEach(() => {
      process.env.NOVU_ENTERPRISE = 'true';
      delete process.env.IS_SELF_HOSTED;
      process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';
    });

    it('rejects creation when the domain matches the configured shared agent inbox domain', async () => {
      const usecase = buildUsecase();

      try {
        await usecase.execute({ ...baseCommand, name: 'agentconnect.sh' });
        throw new Error('Expected execute to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include("reserved for Novu's shared agent inbox");
      }

      expect(domainRepositoryMock.findByName.called).to.equal(false);
      expect(domainRepositoryMock.create.called).to.equal(false);
    });

    it('rejects creation regardless of input casing', async () => {
      const usecase = buildUsecase();

      try {
        await usecase.execute({ ...baseCommand, name: 'AgentConnect.SH' });
        throw new Error('Expected execute to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
      }

      expect(domainRepositoryMock.create.called).to.equal(false);
    });

    it('allows creation of unrelated domains while the feature is enabled', async () => {
      const usecase = buildUsecase();

      const result = await usecase.execute({ ...baseCommand, name: 'inbound.example.com' });

      expect(result.name).to.equal('inbound.example.com');
      expect(domainRepositoryMock.create.calledOnce).to.equal(true);
    });
  });

  describe('when the shared agent inbox feature is not enabled', () => {
    beforeEach(() => {
      delete process.env.NOVU_ENTERPRISE;
      delete process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    });

    it('does not enforce the shared-domain reservation', async () => {
      const usecase = buildUsecase();

      const result = await usecase.execute({ ...baseCommand, name: 'agentconnect.sh' });

      expect(result.name).to.equal('agentconnect.sh');
      expect(domainRepositoryMock.create.calledOnce).to.equal(true);
    });
  });

  it('still surfaces existing-domain conflicts before any reservation passes', async () => {
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';

    domainRepositoryMock.findByName.resolves({ _id: 'existing-id', name: 'inbound.example.com' });

    const usecase = buildUsecase();

    try {
      await usecase.execute({ ...baseCommand, name: 'inbound.example.com' });
      throw new Error('Expected execute to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(ConflictException);
    }

    expect(domainRepositoryMock.create.called).to.equal(false);
  });
});
