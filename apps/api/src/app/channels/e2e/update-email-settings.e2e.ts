import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe.skip('Update Email Settings - /channels/email/settings (PUT)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the senderEmail', async function () {
    const {
      body: { data },
    } = await session.testAgent.put('/v1/channels/email/settings').send({
      senderEmail: 'new-test-email@ntest.co',
      senderName: 'new test name',
    });

    expect(data.channels.email.senderEmail).to.equal('new-test-email@ntest.co');
    expect(data.channels.email.senderName).to.equal('new test name');
  });
});
