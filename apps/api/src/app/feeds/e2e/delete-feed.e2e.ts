import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { StepTypeEnum } from '@novu/shared';
import { FeedRepository, MessageTemplateRepository, NotificationTemplateRepository } from '@novu/dal';
import { CreateWorkflowRequestDto } from '../../workflows/dto';

describe('Delete A Feed - /feeds (POST)', async () => {
  let session: UserSession;
  let feedRepository = new FeedRepository();
  let notificationTemplateRepository = new NotificationTemplateRepository();
  let messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    feedRepository = new FeedRepository();
    notificationTemplateRepository = new NotificationTemplateRepository();
    messageTemplateRepository = new MessageTemplateRepository();
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

  it('should be able to delete feed after template is deleted', async function () {
    const testFeed = {
      name: 'add feed to message',
    };

    const { body } = await session.testAgent.post(`/v1/feeds`).send(testFeed);
    const feed = body.data;

    const testTemplate: Partial<CreateWorkflowRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            content: 'This is a sample text block',
            type: StepTypeEnum.IN_APP,
            feedId: feed._id,
          },
        },
      ],
    };

    const { body: notificationTemplateBody } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    const template = notificationTemplateBody.data;

    const messageTemplateIds = template.steps.map((step) => step._templateId);

    const messageTemplates = await messageTemplateRepository.find({
      _environmentId: session.environment._id,
      _id: { $in: messageTemplateIds },
    });

    expect(messageTemplates.length).to.equal(1);

    await session.testAgent.delete(`/v1/workflows/${template._id}`).send();

    const deletedNotificationTemplate = await notificationTemplateRepository.findOne({
      _environmentId: session.environment._id,
      _id: template._id,
    });

    expect(deletedNotificationTemplate).to.equal(null);

    const deletedIntegration = (
      await notificationTemplateRepository.findDeleted({
        _environmentId: session.environment._id,
        _id: template._id,
      })
    )[0];

    expect(deletedIntegration.deleted).to.equal(true);

    const deletedMessageTemplates = await messageTemplateRepository.find({
      _environmentId: session.environment._id,
      _id: { $in: messageTemplateIds },
    });

    expect(deletedMessageTemplates.length).to.equal(0);

    const { body: deletedFeedBody } = await session.testAgent.delete(`/v1/feeds/${feed._id}`).send();

    expect(deletedFeedBody.data).to.be.ok;

    const deletedFeed = (
      await feedRepository.findDeleted({ _environmentId: session.environment._id, _id: feed._id })
    )[0];

    expect(deletedFeed.deleted).to.equal(true);
  });
});
