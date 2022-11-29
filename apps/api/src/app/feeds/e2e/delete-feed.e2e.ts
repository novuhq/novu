import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { FeedRepository } from '@novu/dal';

describe('Delete A Feed - /feeds (POST)', async () => {
  let session: UserSession;
  let feedRepository = new FeedRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    feedRepository = new FeedRepository();
  });

  it('should not be able to delete feed that has a message', async function () {
    const feeds = await feedRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    await notificationTemplateService.createTemplate();

    const { body } = await session.testAgent.delete(`/v1/feeds/${feeds[0]._id}`).send();

    expect(body.message).to.contains('Can not delete feed that has existing');
  });

  it('should delete feed', async function () {
    const newFeed = {
      name: 'Test name',
    };

    const { body } = await session.testAgent.post(`/v1/feeds`).send(newFeed);
    const newFeedId = body.data._id;
    const feed = await feedRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _id: newFeedId,
    });

    expect(feed.name).to.equal(`Test name`);
    const { body: deletedBody } = await session.testAgent.delete(`/v1/feeds/${newFeedId}`).send();

    expect(deletedBody.data).to.be.ok;
    expect(deletedBody.data.length).to.equal(2);
    const deletedFeed = (
      await feedRepository.findDeleted({ _environmentId: session.environment._id, _id: newFeedId })
    )[0];

    expect(deletedFeed.deleted).to.equal(true);
  });

  it('update existing message with feed', async () => {
    const testFeed = {
      name: 'Test delete feed in message',
    };

    const {
      body: { data: feed },
    } = await session.testAgent.post(`/v1/feeds`).send(testFeed);

    await session.applyChanges({
      enabled: false,
    });

    await session.testAgent.delete(`/v1/feeds/${feed._id}`).send();

    await session.applyChanges({
      enabled: false,
    });

    const feeds = await feedRepository.find({
      _environmentId: session.environment._id,
      name: feed.name,
    });
    expect(feeds.length).to.equal(0);
  });
});
