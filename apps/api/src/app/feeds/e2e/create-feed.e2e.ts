import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { StepTypeEnum } from '@novu/shared';
import { CreateWorkflowRequestDto, UpdateWorkflowRequestDto } from '../../workflows/dto';
import { FeedRepository } from '@novu/dal';

describe('Create A Feed - /feeds (POST)', async () => {
  let session: UserSession;
  const feedRepository: FeedRepository = new FeedRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a new feed', async function () {
    const testFeed = {
      name: 'Test name',
    };

    const { body } = await session.testAgent.post(`/v1/feeds`).send(testFeed);

    expect(body.data).to.be.ok;
    const feed = body.data;

    expect(feed.name).to.equal(`Test name`);
    expect(feed._environmentId).to.equal(session.environment._id);
  });

  it('should promote feed changes with template', async function () {
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

    await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    await session.applyChanges({
      enabled: false,
    });

    const feedsCount = await feedRepository.count({
      name: feed.name,
      _organizationId: session.organization._id,
    });
    expect(feedsCount).to.equal(2);
  });

  it('update existing message with feed', async () => {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            content: 'This is a sample text block',
            type: StepTypeEnum.IN_APP,
          },
        },
      ],
    };

    let {
      body: { data },
    } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    await session.applyChanges({
      enabled: false,
    });

    const notificationTemplateId = data._id;

    const testFeed = {
      name: 'Test update message with feed',
    };

    const {
      body: { data: feed },
    } = await session.testAgent.post(`/v1/feeds`).send(testFeed);

    const step = data.steps[0];
    const update: UpdateWorkflowRequestDto = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      notificationGroupId: data._notificationGroupId,
      steps: [
        {
          _id: step._templateId,
          _templateId: step._templateId,
          template: {
            feedId: feed._id,
            name: 'test',
            type: step.template.type,
            cta: step.template.cta,
            content: step.template.content,
          },
        },
      ],
    };

    const body: any = await session.testAgent.put(`/v1/workflows/${notificationTemplateId}`).send(update);
    data = body.data;

    await session.applyChanges({
      enabled: false,
    });

    const feedsCount = await feedRepository.count({
      name: feed.name,
      _organizationId: session.organization._id,
    });
    expect(feedsCount).to.equal(2);
  });

  it('should throw error if a feed already exist', async function () {
    await session.testAgent.post(`/v1/feeds`).send({
      name: 'identifier_123',
    });
    const { body } = await session.testAgent.post(`/v1/feeds`).send({
      name: 'identifier_123',
    });
    expect(body.statusCode).to.equal(409);
    expect(body.message).to.equal('Feed with identifier: identifier_123 already exists');
  });
});
