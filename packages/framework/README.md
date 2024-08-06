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
import { workflow, CronExpression } from '@novu/framework';
import { serve } from '@novu/framework/next';
import { z } from 'zod';

// Define your notification workflow
const weeklyComments = workflow(
  'comment-on-post',
  async ({ payload, step }) => {
    const inAppResponse = await step.inApp('new-comment', async () => ({
      body: `You have a new comment on your post ${payload.comment}`,
    }));

    const weeklyDigest = await step.digest('weekly-digest', () => ({
      cron: CronExpression.EVERY_WEEK,
    }));

    await step.email(
      'weekly-comments',
      async (controls) => ({
        subject: `${controls.prefix} - Weekly post comments (${weeklyDigest.events.length})`,
        body: `Weekly digest: ${weeklyDigest.events.map(({ payload }) => payload.comment).join(', ')}`,
      }),
      {
        // Skip the notification if the weekly digest is empty
        skip: () => weeklyDigest.events.length === 0,
        // Non-technical stakeholders can modify strongly-validated copy in Novu Cloud
        controlSchema: z.object({ prefix: z.string().describe('The prefix of the subject.').default('Hi!') }),
      }
    );
  },
  { payloadSchema: z.object({ comment: z.string().describe('The comment on the post.') }) }
);

// Use your favorite framework to serve your workflows
const { GET, POST, OPTIONS } = serve({ workflows: [weeklyComments] });

// Trigger your notification workflow
weeklyComments.trigger({ to: 'user:123', comment: 'This is a comment on a post' });
```
