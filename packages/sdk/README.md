# Quickstart

```typescript
const client = new Echo();
client.workflow('comment-on-post', { type: 'object', properties: { post: { type: 'string' } } }, async ({ step }) => {
  const userResponse = step.custom(
    'fetch-user',
    { type: 'object', properties: { name: { type: 'string' } } },
    async () => ({ email: 'joe@bloggs.com' })
  );

  step.email('send-email', async (payload) => {
    return {
      subject: 'You received a post',
      body: `<html><body>${payload.post}</body></html>`,
      to: userResponse.email,
    };
  });

  step.email('send-follow-up', async (payload) => {
    return {
      subject: 'You received a follow-up',
      body: `<html><body>${payload.post}</body></html>`,
      to: userResponse.email,
    };
  });
});

// Get the workflows
const workflows = client.getRegisteredWorkflows();

// Invoke a step
const result = client.invokeStep('comment-on-post', 'fetch-user', { post: 'Hello' }).then(console.log);
```
