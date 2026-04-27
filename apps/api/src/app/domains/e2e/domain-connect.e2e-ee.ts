import { randomBytes } from 'node:crypto';
import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Domain Connect API - /v1/domains/:domainId/domain-connect #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  function uniqueDomainName(): string {
    return `e2e-dc-${randomBytes(6).toString('hex')}.example.test`;
  }

  it('should return disabled status with manual records when Domain Connect flag is off', async () => {
    const { result: domain } = await novuClient.domains.create({ name: uniqueDomainName() });

    const { result: status } = await novuClient.domains.domainConnect.status(domain._id);

    expect(status.available).to.equal(false);
    expect(status.reasonCode).to.equal('disabled');
    expect(status.manualRecords).to.be.an('array');
    expect(status.manualRecords.length).to.be.greaterThan(0);
  });

  it('should return 404 for domain connect status when domain does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439016';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.domainConnect.status(fakeId));

    expect(error?.statusCode).to.equal(404);
  });

  it('should reject apply-url when Domain Connect flag is off (400)', async () => {
    const { result: domain } = await novuClient.domains.create({ name: uniqueDomainName() });

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.domainConnect.create({}, domain._id));

    expect(error?.statusCode).to.equal(400);
    expect(String(error?.message ?? '')).to.match(/not enabled/i);
  });

  it('should return 404 for apply-url when domain does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439017';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.domainConnect.create({}, fakeId));

    expect(error?.statusCode).to.equal(404);
  });
});
