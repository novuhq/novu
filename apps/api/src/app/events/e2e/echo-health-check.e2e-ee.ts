import axios from 'axios';
import { expect } from 'chai';
import { UserSession, SubscribersService } from '@novu/testing';
import { SubscriberEntity } from '@novu/dal';
import { echoServer } from '../../../../e2e/echo.server';
import { workflow } from '@novu/framework';

describe('Echo Health Check', async () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  before(async () => {
    const healthCheckWorkflow = workflow('health-check', async ({ step }) => {
      await step.email('send-email', async (inputs) => {
        return {
          subject: 'This is an email subject',
          body: 'Body result',
        };
      });
    });
    await echoServer.start({ workflows: [healthCheckWorkflow] });
  });

  after(async () => {
    await echoServer.stop();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should have a status', async () => {
    const result = await axios.get(echoServer.serverPath + '/echo?action=health-check');

    expect(result.data.status).to.equal('ok');
  });

  it('should have a version', async () => {
    const result = await axios.get(echoServer.serverPath + '/echo?action=health-check');

    expect(result.data.version).to.be.a('string');
  });

  it('should return the discovered resources', async () => {
    const result = await axios.get(echoServer.serverPath + '/echo?action=health-check');

    expect(result.data.discovered).to.deep.equal({ workflows: 1, steps: 1 });
  });
});
