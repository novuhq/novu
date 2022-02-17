import { ChannelTypeEnum, IMessage, ITemplate } from './template.interface';
import { TemplateStore } from './template.store';

test('should register a template', async () => {
  const store = new TemplateStore();

  await store.addTemplate({
    id: 'test',
    messages: [],
  });

  const templates = await store.getTemplates();

  expect(templates.length).toEqual(1);
  expect(templates[0].id).toEqual('test');
});

test('should get a template by id', async () => {
  const store = new TemplateStore();

  await store.addTemplate({
    id: 'test',
    messages: [],
  });

  await store.addTemplate({
    id: 'test 2',
    messages: [],
  });

  const template = await store.getTemplateById('test');

  expect(template).toBeTruthy();
  expect(template?.id).toEqual('test');
});

describe('active messages', () => {
  test('should filter by boolean', async () => {
    const store = new TemplateStore();

    await store.addTemplate({
      id: 'test',
      messages: [
        {
          active: true,
          channel: ChannelTypeEnum.EMAIL,
          template: 'test1',
        },
        {
          active: false,
          channel: ChannelTypeEnum.EMAIL,
          template: 'test2',
        },
        {
          channel: ChannelTypeEnum.EMAIL,
          template: 'test3',
        },
      ],
    });

    const template = (await store.getTemplateById('test')) as ITemplate;
    const messages = await store.getActiveMessages(template, {
      $user_id: '1234',
      companyType: 'pro',
    });

    expect(messages.length).toEqual(2);
  });

  test('should filter by function', async () => {
    const store = new TemplateStore();

    await store.addTemplate({
      id: 'test',
      messages: [
        {
          active: () => true,
          channel: ChannelTypeEnum.EMAIL,
          template: 'test1',
        },
        {
          active: async () => true,
          channel: ChannelTypeEnum.EMAIL,
          template: 'test2',
        },
        {
          active: async () => false,
          channel: ChannelTypeEnum.EMAIL,
          template: 'test3',
        },
        {
          channel: ChannelTypeEnum.EMAIL,
          template: 'test4',
        },
      ],
    });

    const template = (await store.getTemplateById('test')) as ITemplate;
    const messages = await store.getActiveMessages(template, {
      $user_id: '1234',
      companyType: 'pro',
    });

    expect(messages.length).toEqual(3);

    expect(getMessageByTemplate(messages, 'test1')).toBeTruthy();
    expect(getMessageByTemplate(messages, 'test2')).toBeTruthy();
    expect(getMessageByTemplate(messages, 'test3')).toBeFalsy();
    expect(getMessageByTemplate(messages, 'test4')).toBeTruthy();
  });
});

function getMessageByTemplate(messages: IMessage[], template: string) {
  return messages.find((message) => message.template === template);
}
