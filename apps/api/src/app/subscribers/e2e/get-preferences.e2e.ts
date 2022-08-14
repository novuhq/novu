import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { NotificationTemplateEntity } from '@novu/dal';

const axiosInstance = axios.create();

describe('Get Subscribers preferences - /subscribers/preferences/:subscriberId (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should get subscriber preferences', async function () {
    const response = await getPreference(session);

    const data = response.data.data[0];

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
  });
});

export async function getPreference(session) {
  return await axiosInstance.get(`${session.serverUrl}/v1/subscribers/${session.subscriberId}/preferences`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
