import { Test } from '@nestjs/testing';
import { ChangeRepository, DalService, LayoutRepository, MessageTemplateRepository } from '@novu/dal';
import { EmailBlockTypeEnum, ResourceTypeEnum, StepTypeEnum, TemplateVariableTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { CreateChange } from '../../create-change';
import { UpdateChange } from '../../update-change';
import { CreateMessageTemplateCommand } from './create-message-template.command';
import { CreateMessageTemplate } from './create-message-template.usecase';

describe('Create Message Template', () => {
  const dalService = new DalService();
  let useCase: CreateMessageTemplate;

  beforeAll(async () => {
    await dalService.connect(process.env.MONGO_URL as string);
  });

  afterAll(async () => {
    await dalService.disconnect();
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateMessageTemplate,
        MessageTemplateRepository,
        LayoutRepository,
        CreateChange,
        UpdateChange,
        ChangeRepository,
      ],
    }).compile();

    useCase = moduleRef.get<CreateMessageTemplate>(CreateMessageTemplate);
  });

  it('should create the message template', async () => {
    const userId = MessageTemplateRepository.createObjectId();
    const organizationId = MessageTemplateRepository.createObjectId();
    const environmentId = MessageTemplateRepository.createObjectId();
    const parentChangeId = MessageTemplateRepository.createObjectId();
    const content = [{ type: EmailBlockTypeEnum.TEXT, content: 'test' }];
    const command = CreateMessageTemplateCommand.create({
      userId,
      organizationId,
      environmentId,
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
        {
          type: TemplateVariableTypeEnum.STRING,
          name: 'test',
          required: false,
          defaultValue: 'test',
        },
      ],
      content,
      parentChangeId,
      workflowType: ResourceTypeEnum.REGULAR,
    });

    const result = await useCase.execute(command);

    expect(result).to.ownProperty('_id');
    expect(result).to.ownProperty('createdAt');
    expect(result).to.ownProperty('updatedAt');
    expect(result).to.ownProperty('_layoutId');
    expect(result._organizationId).to.eql(organizationId);
    expect(result._environmentId).to.eql(environmentId);
    expect(result._creatorId).to.eql(userId);
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
