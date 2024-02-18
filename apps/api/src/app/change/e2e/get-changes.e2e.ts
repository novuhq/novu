import { expect } from 'chai';
import { ChangeRepository } from '@novu/dal';
import {
  EmailBlockTypeEnum,
  StepTypeEnum,
  FilterPartTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';

import { CreateWorkflowRequestDto, UpdateWorkflowRequestDto } from '../../workflows/dto';

describe('Get changes', () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('get list of changes', async () => {
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
            content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
            type: StepTypeEnum.EMAIL,
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: FieldLogicalOperatorEnum.AND,
              children: [
                {
                  on: FilterPartTypeEnum.SUBSCRIBER,
                  field: 'firstName',
                  value: 'test value',
                  operator: FieldOperatorEnum.EQUAL,
                },
              ],
            },
          ],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    await session.applyChanges();

    const updateData: UpdateWorkflowRequestDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const notificationTemplateId = body.data._id;

    await session.testAgent.put(`/v1/workflows/${notificationTemplateId}`).send(updateData);

    const {
      body: { data },
    } = await session.testAgent.get(`/v1/changes?promoted=true`);

    const changes = await changeRepository.find({
      _environmentId: session.environment._id,
      enabled: true,
      _parentId: { $exists: false, $eq: null },
    });

    expect(data.length).to.eq(changes.length);
  });
});
