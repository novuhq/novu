import { UserSession } from '@notifire/testing';
import { expect } from 'chai';

describe.skip('Update SMS Settings - /channels/sms/settings (PUT)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the sms settings', async function () {
    const { body } = await session.testAgent.put('/v1/channels/sms/settings').send({
      twillio: {
        authToken: '5678',
        accountSid: '12345',
        phoneNumber: '+11111111',
      },
    });
    const { data } = body;

    expect(data.channels.sms.twillio.authToken).to.equal('5678');
    expect(data.channels.sms.twillio.accountSid).to.equal('12345');
    expect(data.channels.sms.twillio.phoneNumber).to.equal('+11111111');
  });
});
