import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { LayoutRepository } from '@novu/dal';
import { TemplateVariableTypeEnum } from '@novu/shared';

import { FindDeletedLayoutUseCase } from './find-deleted-layout.use-case';
import { FindDeletedLayoutCommand } from './find-deleted-layout.command';

import { CreateLayoutUseCase, CreateLayoutCommand } from '../create-layout';
import { DeleteLayoutUseCase, DeleteLayoutCommand } from '../delete-layout';

import { SharedModule } from '../../../shared/shared.module';
import { ChangeModule } from '../../../change/change.module';
import { MessageTemplateModule } from '../../../message-template/message-template.module';

describe('Find Deleted Layout Usecase', function () {
  let createLayoutUseCase: CreateLayoutUseCase;
  let deleteLayoutUseCase: DeleteLayoutUseCase;
  let findDeletedLayoutUseCase: FindDeletedLayoutUseCase;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, ChangeModule, MessageTemplateModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    findDeletedLayoutUseCase = moduleRef.get<FindDeletedLayoutUseCase>(FindDeletedLayoutUseCase);
    createLayoutUseCase = moduleRef.get<CreateLayoutUseCase>(CreateLayoutUseCase);
    deleteLayoutUseCase = moduleRef.get<DeleteLayoutUseCase>(DeleteLayoutUseCase);
  });

  it('should throw an error if there is no deleted layout', async () => {
    const nonExistentLayoutId = LayoutRepository.createObjectId();

    const command = FindDeletedLayoutCommand.create({
      layoutId: nonExistentLayoutId,
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      userId: session.user._id,
    });

    try {
      const result = await findDeletedLayoutUseCase.execute(command);
      expect(result).not.to.be.ok;
    } catch (error) {
      expect(error.response).to.eql({
        message: `Layout deleted not found for id ${nonExistentLayoutId} in the environment ${session.environment._id}`,
        error: 'Not Found',
        statusCode: 404,
      });
    }
  });

  it('should find the deleted layout', async () => {
    const environmentId = session.environment._id;
    const organizationId = session.organization._id;
    const userId = session.user._id;

    const name = 'find-deleted-layout-name';
    const identifier = 'find-deleted-layout-identifier';
    const description = 'Amazing new layout';
    const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
    const variables = [
      { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
    ];
    const isDefault = false;

    const createCommand = CreateLayoutCommand.create({
      content,
      identifier,
      description,
      environmentId,
      isDefault,
      name,
      organizationId,
      userId,
      variables,
    });
    const createdLayout = await createLayoutUseCase.execute(createCommand);

    const layoutId = createdLayout._id;

    const deleteCommand = DeleteLayoutCommand.create({
      layoutId,
      environmentId,
      organizationId,
      userId,
    });
    await deleteLayoutUseCase.execute(deleteCommand);

    const findDeletedLayoutCommand = FindDeletedLayoutCommand.create({
      layoutId,
      environmentId,
      organizationId,
      userId,
    });
    const foundDeletedLayout = await findDeletedLayoutUseCase.execute(findDeletedLayoutCommand);

    expect(foundDeletedLayout._id).to.eql(layoutId);
    expect(foundDeletedLayout.isDeleted).to.eql(true);
  });
});
