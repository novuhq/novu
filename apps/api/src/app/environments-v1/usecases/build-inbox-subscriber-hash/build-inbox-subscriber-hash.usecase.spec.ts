import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { buildDashboardWebChatSubscriberId } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { BuildInboxSubscriberHashCommand } from './build-inbox-subscriber-hash.command';
import { BuildInboxSubscriberHash } from './build-inbox-subscriber-hash.usecase';

const USER_ID = 'user-123';
const ENVIRONMENT_ID = 'env-123';
const ORGANIZATION_ID = 'org-123';
const API_KEY = 'test-environment-api-key';

describe('BuildInboxSubscriberHash', () => {
  const environmentRepository = new EnvironmentRepository();
  const usecase = new BuildInboxSubscriberHash(environmentRepository);
  let getApiKeysStub: sinon.SinonStub;

  beforeEach(() => {
    getApiKeysStub = sinon.stub(environmentRepository, 'getApiKeys').resolves([{ key: API_KEY, _userId: USER_ID }]);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should mint a subscriberHash for the authenticated user id', async () => {
    const result = await usecase.execute(
      BuildInboxSubscriberHashCommand.create({
        userId: USER_ID,
        environmentId: ENVIRONMENT_ID,
        organizationId: ORGANIZATION_ID,
        subscriberId: USER_ID,
      })
    );

    expect(result.subscriberHash).to.equal(createHash(API_KEY, USER_ID));
    expect(getApiKeysStub.calledOnceWithExactly(ENVIRONMENT_ID)).to.equal(true);
  });

  it('should mint a subscriberHash for the dashboard web-chat tester id', async () => {
    const webChatSubscriberId = buildDashboardWebChatSubscriberId(USER_ID);

    const result = await usecase.execute(
      BuildInboxSubscriberHashCommand.create({
        userId: USER_ID,
        environmentId: ENVIRONMENT_ID,
        organizationId: ORGANIZATION_ID,
        subscriberId: webChatSubscriberId,
      })
    );

    expect(result.subscriberHash).to.equal(createHash(API_KEY, webChatSubscriberId));
  });

  it('should reject subscriber ids that are not owned by the dashboard user', async () => {
    try {
      await usecase.execute(
        BuildInboxSubscriberHashCommand.create({
          userId: USER_ID,
          environmentId: ENVIRONMENT_ID,
          organizationId: ORGANIZATION_ID,
          subscriberId: 'someone-else',
        })
      );
      throw new Error('expected ForbiddenException');
    } catch (error) {
      expect(error).to.be.instanceOf(ForbiddenException);
    }

    expect(getApiKeysStub.called).to.equal(false);
  });

  it('should throw when the environment has no API keys', async () => {
    getApiKeysStub.resolves([]);

    try {
      await usecase.execute(
        BuildInboxSubscriberHashCommand.create({
          userId: USER_ID,
          environmentId: ENVIRONMENT_ID,
          organizationId: ORGANIZATION_ID,
          subscriberId: USER_ID,
        })
      );
      throw new Error('expected NotFoundException');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
    }
  });
});
