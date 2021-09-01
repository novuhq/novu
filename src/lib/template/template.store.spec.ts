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
  expect(template.id).toEqual('test');
});
