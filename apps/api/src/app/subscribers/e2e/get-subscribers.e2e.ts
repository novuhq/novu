import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';

const axiosInstance = axios.create();

describe('Get Subscribers - /subscribers (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should list created subscriber', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
        phone: '+972523333333',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const response = await axiosInstance.get(`${session.serverUrl}/v1/subscribers`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    const filteredData = filterOutInitialSessionUsers(response.data);
    expect(filteredData.length).to.equal(1);
    const subscriber = filteredData[0];
    expect(subscriber.subscriberId).to.equal('123');
  });
});

function filterOutInitialSessionUsers(body) {
  return body.data.filter((user) => user.lastName !== 'Test');
}
