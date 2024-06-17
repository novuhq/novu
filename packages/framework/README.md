<div align="center">
  <a href="https://novu.co?utm_source=github" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

# Code-First Notifications Workflow SDK

[![Version](https://img.shields.io/npm/v/@novu/framework.svg)](https://www.npmjs.org/package/@novu/framework)
[![Downloads](https://img.shields.io/npm/dm/@novu/framework.svg)](https://www.npmjs.com/package/@novu/framework)

Novu Framework allows you to write notification workflows in your codebase. Workflows are functions that execute business logic and use your preferred libraries for email, SMS, and chat generation. You can use Novu Framework with [React.Email](https://react.email/), [MJML](https://mjml.io/), or any other template generator.

Learn more about the Code-First Notifications Workflow SDK in our [docs](https://docs.novu.co/framework/quickstart).

## Installation

```bash
npm install @novu/framework
```

## Quickstart

```typescript
import { workflow } from '@novu/framework';
import { serve } from '@novu/framework/express';

const commentWorkflow = await workflow(
  'comment-on-post',
  async ({ payload, step }) => {
    const inAppResponse = await step.inApp('notify-user', async () => ({
      body: renderBody(payload.postId),
    }));

    const weeklyDigest = await step.digest('wait-1-week', () => ({
      amount: 7,
      unit: 'days',
    }));

    await step.email(
      'weekly-comments',
      async (inputs) => {
        return {
          subject: `Weekly post comments (${weeklyDigest.events.length + 1})`,
          body: renderReactEmail(inputs, weeklyDigest.events),
        };
      },
      { skip: () => inAppResponse.seen }
    );
  },
  {
    payloadSchema: {
      type: 'object',
      properties: {
        postId: {
          title: 'Post ID',
          type: 'string',
          description: 'The ID of the post.',
          default: '123',
        },
      },
      required: ['postId'],
      additionalProperties: false,
    } as const,
  }
);

serve({ workflows: [commentWorkflow] });
```
