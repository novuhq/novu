import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { ClickUpProvider } from './clickup.provider';

test('should create a task comment when taskId is provided', async () => {
  const { mockPost } = axiosSpy({
    data: { id: 'comment-123' },
  });

  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  const result = await provider.sendMessage({
    content: 'Test notification',
    customData: { taskId: 'task_abc' },
  });

  expect(mockPost).toHaveBeenCalledWith('/task/task_abc/comment', {
    comment_text: 'Test notification',
    notify_all: true,
  });
  expect(result.id).toBe('comment-123');
});

test('should create a task when listId is provided', async () => {
  const { mockPost } = axiosSpy({
    data: { id: 'task-456', date_created: '1709654400000' },
  });

  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  const result = await provider.sendMessage({
    content: 'New task notification',
    customData: { listId: 'list_xyz' },
  });

  expect(mockPost).toHaveBeenCalledWith('/list/list_xyz/task', {
    name: 'New task notification',
    markdown_description: 'New task notification',
    notify_all: true,
  });
  expect(result.id).toBe('task-456');
});

test('should throw error when neither taskId nor listId is provided', async () => {
  axiosSpy({});
  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  await expect(
    provider.sendMessage({
      content: 'Test notification',
      customData: {},
    })
  ).rejects.toThrow('ClickUp provider requires either taskId or listId in customData');
});

test('should support _passthrough data for task comments', async () => {
  const { mockPost } = axiosSpy({
    data: { id: 'comment-789' },
  });

  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  await provider.sendMessage(
    {
      content: 'Test notification',
      customData: { taskId: 'task_abc' },
    },
    {
      _passthrough: {
        body: {
          notify_all: false,
          assignee: 12345,
        },
      },
    }
  );

  expect(mockPost).toHaveBeenCalledWith('/task/task_abc/comment', {
    comment_text: 'Test notification',
    notify_all: false,
    assignee: 12345,
  });
});
