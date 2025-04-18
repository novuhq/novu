import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { Novu } from '@novu/api';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const axiosInstance = axios.create();

describe('Get Subscribers - /subscribers (GET) #novu-v2', function () {
  let session: UserSession;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should list created subscriber', async function () {
    const subscriberId = '123';
    const topicKey = 'test-topic';
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      phone: '+972523333333',
    });
    const response = await novuClient.subscribers.list();

    const filteredData = response.result.data.filter((user) => user.lastName !== 'Test');
    expect(filteredData.length).to.equal(1);
    const subscriber = filteredData[0];
    expect(subscriber.subscriberId).to.equal('123');
  });
  it('should search created subscriber', async function () {
    const subscriberId = '123';
    const topicKey = 'test-topic';
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      phone: '+972523333333',
    });
    await novuClient.topics.subscribers.assign({ subscribers: [subscriberId] }, topicKey);
    const response = await novuClient.subscribers.search({});

    const filteredData = response.result.data.filter((user) => user.lastName !== 'Test');
    expect(filteredData.length).to.equal(1);
    const subscriber = filteredData[0];
    expect(subscriber.subscriberId).to.equal('123');
    expect(subscriber.topics).to.not.be.empty;
    expect(subscriber.topics![0]).to.equal(topicKey);
  });
});
