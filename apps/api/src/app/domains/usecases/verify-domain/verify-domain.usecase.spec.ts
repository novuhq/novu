import * as dns from 'node:dns';
import { NotFoundException } from '@nestjs/common';
import type { DomainEntity } from '@novu/dal';
import { DomainStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import { VerifyDomain } from './verify-domain.usecase';

describe('VerifyDomain usecase', () => {
  const previousEnv = { ...process.env };

  const baseCommand = {
    domain: 'inbound.example.com',
    environmentId: 'env-id',
    organizationId: 'org-id',
    userId: 'user-id',
  };

  let domainRepositoryMock: { findOne: sinon.SinonStub; update: sinon.SinonStub };
  let loggerMock: { setContext: sinon.SinonStub; debug: sinon.SinonStub; warn: sinon.SinonStub };
  let resolveMxStub: sinon.SinonStub;

  function buildDomain(overrides: Partial<DomainEntity> = {}): DomainEntity {
    return {
      _id: 'domain-id',
      name: 'inbound.example.com',
      status: DomainStatusEnum.PENDING,
      mxRecordConfigured: false,
      _environmentId: 'env-id',
      _organizationId: 'org-id',
      ...overrides,
    } as DomainEntity;
  }

  function buildUsecase() {
    return new VerifyDomain(domainRepositoryMock as any, loggerMock as any);
  }

  beforeEach(async () => {
    process.env.MAIL_SERVER_DOMAIN = 'mail.novu.co';

    domainRepositoryMock = {
      findOne: stub(),
      update: stub().resolves(),
    };

    loggerMock = {
      setContext: stub(),
      debug: stub(),
      warn: stub(),
    };

    resolveMxStub = stub(dns.promises, 'resolveMx');
  });

  afterEach(() => {
    restore();
    process.env = { ...previousEnv };
  });

  it('marks domain as verified when DNS returns matching MX record', async () => {
    const domain = buildDomain();
    domainRepositoryMock.findOne.resolves(domain);
    resolveMxStub.resolves([{ exchange: 'mail.novu.co', priority: 10 }]);

    const usecase = buildUsecase();
    const result = await usecase.execute(baseCommand);

    expect(result.mxRecordConfigured).to.equal(true);
    expect(result.status).to.equal(DomainStatusEnum.VERIFIED);
    expect(domainRepositoryMock.update.calledOnce).to.equal(true);
    expect(
      domainRepositoryMock.update.calledWithMatch(
        { _id: 'domain-id' },
        { $set: { mxRecordConfigured: true, status: DomainStatusEnum.VERIFIED } }
      )
    ).to.equal(true);
  });

  it('keeps domain pending when DNS definitively returns no matching MX record (ENOTFOUND)', async () => {
    const domain = buildDomain();
    domainRepositoryMock.findOne.resolves(domain);
    const notFoundError = Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
    resolveMxStub.rejects(notFoundError);

    const usecase = buildUsecase();
    const result = await usecase.execute(baseCommand);

    expect(result.mxRecordConfigured).to.equal(false);
    expect(result.status).to.equal(DomainStatusEnum.PENDING);
    expect(domainRepositoryMock.update.called).to.equal(false);
  });

  it('preserves verified state when DNS lookup fails with a transient error (ESERVFAIL)', async () => {
    const domain = buildDomain({ status: DomainStatusEnum.VERIFIED, mxRecordConfigured: true });
    domainRepositoryMock.findOne.resolves(domain);
    const transientError = Object.assign(new Error('ESERVFAIL'), { code: 'ESERVFAIL' });
    resolveMxStub.rejects(transientError);

    const usecase = buildUsecase();
    const result = await usecase.execute(baseCommand);

    expect(result.mxRecordConfigured).to.equal(true);
    expect(result.status).to.equal(DomainStatusEnum.VERIFIED);
    expect(domainRepositoryMock.update.called).to.equal(false);
    expect(loggerMock.warn.calledOnce).to.equal(true);
  });

  it('throws NotFoundException when domain does not exist', async () => {
    domainRepositoryMock.findOne.resolves(null);

    const usecase = buildUsecase();

    try {
      await usecase.execute(baseCommand);
      throw new Error('Expected NotFoundException to be thrown.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
    }
  });
});
