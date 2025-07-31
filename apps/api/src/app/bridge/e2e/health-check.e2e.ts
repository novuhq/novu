import { SubscriberEntity } from '@novu/dal';
import { workflow } from '@novu/framework';
import { SubscribersService, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import getPort from 'get-port';
import { TestBridgeServer } from '../../../../e2e/test-bridge-server';

describe('Bridge Health Check #novu-v2', async () => {
  let session: UserSession;
  let bridgeServer: TestBridgeServer;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  before(async () => {
    const healthCheckWorkflow = workflow('health-check', async ({ step }) => {
      await step.email('send-email', async (controls) => {
        return {
          subject: 'This is an email subject',
          body: 'Body result',
        };
      });
    });
    const port = await getPort();
    bridgeServer = new TestBridgeServer(port);
    await bridgeServer.start({ workflows: [healthCheckWorkflow] });
  });

  after(async () => {
    await bridgeServer.stop();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should have a status', async () => {
    const result = await axios.get(`${bridgeServer.serverPath}/novu?action=health-check`);

    expect(result.data.status).to.equal('ok');
  });

  it('should have an sdk version', async () => {
    const result = await axios.get(`${bridgeServer.serverPath}/novu?action=health-check`);

    expect(result.data.sdkVersion).to.be.a('string');
  });

  it('should have a framework version', async () => {
    const result = await axios.get(`${bridgeServer.serverPath}/novu?action=health-check`);

    expect(result.data.frameworkVersion).to.be.a('string');
  });

  it('should return the discovered resources', async () => {
    const result = await axios.get(`${bridgeServer.serverPath}/novu?action=health-check`);

    expect(result.data.discovered).to.deep.equal({ workflows: 1, steps: 1 });
  });
});
