import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { MessageTemplateRepository } from '@novu/dal';
import { EmailBlockTypeEnum, StepTypeEnum, TemplateVariableTypeEnum } from '@novu/shared';
import { expect } from 'chai';

import { CreateMessageTemplate } from './create-message-template.usecase';
import { CreateMessageTemplateCommand } from './create-message-template.command';

import { SharedModule } from '../../../shared/shared.module';
import { MessageTemplateModule } from '../../message-template.module';

describe('Create Message Template', function () {
  let useCase: CreateMessageTemplate;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, MessageTemplateModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateMessageTemplate>(CreateMessageTemplate);
  });

  it('should create the message template', async function () {
    const parentChangeId = MessageTemplateRepository.createObjectId();
    const content = [{ type: EmailBlockTypeEnum.TEXT, content: 'test' }];
    const command = CreateMessageTemplateCommand.create({
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      type: StepTypeEnum.PUSH,
      name: 'test-message-template',
      title: 'test',
      variables: [
        {
          type: TemplateVariableTypeEnum.STRING,
          name: 'test',
          required: false,
          defaultValue: '',
        },
        { type: TemplateVariableTypeEnum.STRING, name: 'test', required: false, defaultValue: 'test' },
      ],
      content,
      parentChangeId,
    });

    const result = await useCase.execute(command);

    expect(result).to.ownProperty('_id');
    expect(result).to.ownProperty('createdAt');
    expect(result).to.ownProperty('updatedAt');
    expect(result).to.ownProperty('_layoutId');
    expect(result._organizationId).to.eql(session.organization._id);
    expect(result._environmentId).to.eql(session.environment._id);
    expect(result._creatorId).to.eql(session.user._id);
    expect(result._feedId).to.eql(null);
    expect(result._layoutId).to.eql(null);
    expect(result.type).to.eql(StepTypeEnum.PUSH);
    expect(result.active).to.eql(true);
    expect(result.name).to.eql('test-message-template');
    expect(result.title).to.eql('test');
    expect(result.content).to.eql(content);
    expect(result.variables?.at(0)?.defaultValue).to.eql(undefined);
  });
});
