import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { MessageTemplateRepository } from '@novu/dal';
import { EmailBlockTypeEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';

import { createLayout } from './helpers';

import { MessageTemplateModule } from '../../message-template/message-template.module';
import { CreateMessageTemplate, CreateMessageTemplateCommand } from '../../message-template/usecases';
import { SharedModule } from '../../shared/shared.module';

const BASE_PATH = '/v1/layouts';

describe('Delete a layout - /layouts/:layoutId (DELETE)', async () => {
  let useCase: CreateMessageTemplate;
  let session: UserSession;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, MessageTemplateModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateMessageTemplate>(CreateMessageTemplate);
  });

  it('should soft delete the requested layout successfully if exists in the database for that user', async () => {
    const layoutName = 'layout-name-deletion';
    const layoutIdentifier = 'layout-identifier-deletion';
    const isDefault = false;
    const createdLayout = await createLayout(session, layoutName, isDefault, layoutIdentifier);
    const url = `${BASE_PATH}/${createdLayout._id}`;
    const deleteResponse = await session.testAgent.delete(url);

    expect(deleteResponse.statusCode).to.eql(204);
    expect(deleteResponse.body).to.eql({});

    const checkIfDeletedResponse = await session.testAgent.get(url);
    expect(checkIfDeletedResponse.statusCode).to.eql(404);
  });

  it('should throw a not found error when the layout ID to soft delete does not exist in the database', async () => {
    const nonExistingLayoutId = 'ab12345678901234567890ab';
    const url = `${BASE_PATH}/${nonExistingLayoutId}`;
    const { body } = await session.testAgent.delete(url);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(
      `Layout not found for id ${nonExistingLayoutId} in the environment ${session.environment._id}`
    );
    expect(body.error).to.eql('Not Found');
  });

  it('should throw a conflict error when the layout ID to soft delete is the default layout', async () => {
    const layoutName = 'layout-name-deletion';
    const layoutIdentifier = 'layout-identifier-deletion';
    const isDefault = true;
    const createdLayout = await createLayout(session, layoutName, isDefault, layoutIdentifier);
    const url = `${BASE_PATH}/${createdLayout._id}`;
    const deleteResponse = await session.testAgent.delete(url);

    expect(deleteResponse.statusCode).to.eql(409);
    expect(deleteResponse.body).to.eql({
      error: 'Conflict',
      message: `Layout with id ${createdLayout._id} is being used as your default layout, so it can not be deleted`,
      statusCode: 409,
    });
  });

  it('should throw a conflict error when the layout ID to soft delete is associated to message templates', async () => {
    const layoutName = 'layout-name-deletion-conflict';
    const layoutIdentifier = 'layout-identifier-deletion-conflict';
    const isDefault = true;
    const createdLayout = await createLayout(session, layoutName, isDefault, layoutIdentifier);

    const parentChangeId = MessageTemplateRepository.createObjectId();
    const content = [{ type: EmailBlockTypeEnum.TEXT, content: 'test' }];
    const command = CreateMessageTemplateCommand.create({
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      type: StepTypeEnum.PUSH,
      name: 'test-message-template',
      title: 'test',
      layoutId: createdLayout._id,
      variables: [],
      content,
      parentChangeId,
    });

    const result = await useCase.execute(command);
    expect(result._layoutId).to.eql(createdLayout._id);

    const url = `${BASE_PATH}/${createdLayout._id}`;
    const deleteResponse = await session.testAgent.delete(url);

    expect(deleteResponse.statusCode).to.eql(409);
    expect(deleteResponse.body).to.eql({
      error: 'Conflict',
      message: `Layout with id ${createdLayout._id} is being used so it can not be deleted`,
      statusCode: 409,
    });
  });
});
