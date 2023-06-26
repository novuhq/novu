import { expect } from 'chai';
import { ChangeRepository } from '@novu/dal';
import { EmailBlockTypeEnum, StepTypeEnum, FilterPartTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { HttpStatus } from '@nestjs/common';

import {
  CreateNotificationTemplateRequestDto,
  UpdateNotificationTemplateRequestDto,
} from '../../notification-template/dto';

describe('Delete changes', () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('delete change', async () => {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
            type: StepTypeEnum.EMAIL,
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [
                {
                  on: FilterPartTypeEnum.SUBSCRIBER,
                  field: 'firstName',
                  value: 'test value',
                  operator: 'EQUAL',
                },
              ],
            },
          ],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    await session.applyChanges();

    const updateData: UpdateNotificationTemplateRequestDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const notificationTemplateId = body.data._id;

    await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(updateData);

    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _entityId: notificationTemplateId,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    const res = await session.testAgent.delete(`/v1/changes/${changes[0]._id}`).send();
    expect(res.status).to.equal(HttpStatus.OK);

    const isDeleted = !(await changeRepository.findOne({
      _id: changes[0]._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _entityId: notificationTemplateId,
    }));

    expect(isDeleted).to.equal(true);
  });
});
