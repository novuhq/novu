import { ChangeRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateNotificationTemplateDto } from '../../notification-template/dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../../notification-template/dto/update-notification-template.dto';

describe('Get changes', () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();

  const applyChanges = async () => {
    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    await changes.reduce(async (prev, change) => {
      await session.testAgent.post(`/v1/changes/${change._id}/apply`);
    }, Promise.resolve());
  };

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('get list of changes', async () => {
    const testTemplate: Partial<CreateNotificationTemplateDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          name: 'Message Name',
          subject: 'Test email subject',
          type: ChannelTypeEnum.EMAIL,
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [
                {
                  field: 'firstName',
                  value: 'test value',
                  operator: 'EQUAL',
                },
              ],
            },
          ],
          content: [
            {
              type: 'text',
              content: 'This is a sample text block',
            },
          ],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    await applyChanges();

    const updateData: UpdateNotificationTemplateDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const notificationTemplateId = body.data._id;

    await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(updateData);

    const {
      body: { data },
    } = await session.testAgent.get(`/v1/changes?promoted=true`);

    const changes = await changeRepository.find({
      enabled: true,
    });

    expect(data.length).to.eq(changes.length);
  });
});
