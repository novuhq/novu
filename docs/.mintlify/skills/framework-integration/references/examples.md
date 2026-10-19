# Examples Cookbook

Real-world workflow patterns built with `@novu/framework`.

## Multi-Step Onboarding

Send a welcome email immediately, wait a week, then nudge with an in-app reminder if the user opted in.

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";
import { renderEmail } from "../emails/welcome";

export const onboardingWorkflow = workflow(
  "new-signup",
  async ({ step, payload }) => {
    await step.email("welcome-email", async () => {
      const user = await db.getUser(payload.userId);

      return {
        subject: `Welcome to Acme ${user.tier}, ${user.name}!`,
        body: renderEmail({ name: user.name, tier: user.tier }),
      };
    });

    await step.delay("wait-1-week", async () => ({
      unit: "weeks",
      amount: 1,
    }));

    await step.inApp("nudge", async (controls) => {
      const user = await db.getUser(payload.userId);

      return {
        subject: "How is it going?",
        body: `Hey ${user.name}, how do you like Acme so far?`,
        primaryAction: {
          label: "Give Feedback",
          redirect: { url: controls.feedbackUrl, target: "_blank" },
        },
      };
    }, {
      controlSchema: z.object({
        feedbackUrl: z.string().url().default("https://acme.com/feedback"),
      }),
      skip: () => !payload.shouldFollowUp,
    });
  },
  {
    payloadSchema: z.object({
      userId: z.string(),
      shouldFollowUp: z.boolean().default(true),
    }),
    name: "New Signup Onboarding",
    tags: ["onboarding", "lifecycle"],
  }
);
```

## Skip Email if In-App Was Read

Send an in-app notification, wait 6 hours, then send an email — but skip the email if the in-app was read.

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";

export const reminderWorkflow = workflow(
  "task-reminder",
  async ({ step, payload }) => {
    const inApp = await step.inApp("send-in-app", async () => ({
      subject: "Task reminder!",
      body: "Task is not yet complete. Please complete the task.",
      data: { taskId: payload.taskId },
    }));

    await step.delay("wait-6h", async () => ({
      unit: "hours",
      amount: 6,
    }));

    await step.email("send-email", async () => ({
      subject: "Task reminder!",
      body: "Task is not yet complete. Please complete the task.",
    }), {
      skip: () => inApp.read === true,
    });
  },
  {
    payloadSchema: z.object({ taskId: z.string() }),
    tags: ["reminder"],
  }
);
```

## Daily Digest with React Email

Aggregate all triggers within 24 hours into a single email.

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";
import { render } from "@react-email/components";
import { ActivityDigestEmail } from "../emails/activity-digest";

export const dailyDigestWorkflow = workflow(
  "activity-digest",
  async ({ step, payload }) => {
    const { events } = await step.digest("digest-window", async () => ({
      unit: "days",
      amount: 1,
    }));

    await step.email("send-summary", async () => {
      const activities = events.map((e) => ({
        type: e.payload.type,
        user: e.payload.userName,
        action: e.payload.action,
        time: e.time,
      }));

      return {
        subject: `Activity Summary (${events.length} updates)`,
        body: render(<ActivityDigestEmail activities={activities} />),
      };
    });
  },
  {
    payloadSchema: z.object({
      type: z.enum(["comment", "like", "follow"]),
      userName: z.string(),
      action: z.string(),
    }),
    tags: ["digest"],
  }
);
```

## Cron-Based Digest

Send a single morning digest at 9am UTC every day.

```typescript
export const morningDigest = workflow(
  "morning-digest",
  async ({ step }) => {
    const { events } = await step.digest("digest", async () => ({
      cron: "0 9 * * *", // every day at 09:00 UTC
    }));

    if (events.length === 0) return;

    await step.email("digest", async () => ({
      subject: `${events.length} updates from yesterday`,
      body: render(<MorningDigest events={events} />),
    }));
  }
);
```

## Custom Digest Key (Per-Project)

Aggregate events by `subscriberId + projectId` instead of just `subscriberId`.

```typescript
export const projectDigestWorkflow = workflow(
  "project-digest",
  async ({ step, payload }) => {
    const { events } = await step.digest("digest-step", async () => ({
      unit: "hours",
      amount: 1,
      digestKey: payload.projectId,
    }));

    await step.inApp("notify", async () => ({
      subject: `${events.length} updates in ${payload.projectName}`,
      body: events.map((e) => e.payload.title).join(", "),
    }));
  },
  {
    payloadSchema: z.object({
      projectId: z.string(),
      projectName: z.string(),
      title: z.string(),
    }),
  }
);
```

## Two-Stage Digest with LLM Categorization

A workflow can trigger another workflow via `step.custom`. Use this to chain digests when you need two windows.

```typescript
import { categorizeUsingLLM } from "../lib/llm";

const summaryWorkflow = workflow(
  "llm-summary",
  async ({ step }) => {
    const { events } = await step.digest("digest-6h", async () => ({
      unit: "hours",
      amount: 6,
    }));

    await step.email("summary", async () => {
      const allRequests = events.map((e) => e.payload.requests);
      const { bugs, features, praise } = await categorizeUsingLLM(allRequests);

      return {
        subject: "LLM Feedback Digest — Last 6 Hours",
        body: `
          Bugs reported: ${bugs}\n
          Feature requests: ${features}\n
          Praise received: ${praise}\n
        `,
      };
    });
  }
);

export const requestsWorkflow = workflow(
  "customer-requests",
  async ({ step, subscriber, payload }) => {
    const { events } = await step.digest("digest-15m", async () => ({
      unit: "minutes",
      amount: 15,
    }));

    await step.inApp("in-app-summary", async () => ({
      subject: `${events.length} new requests`,
      body: `You've received ${events.length} customer requests in the last 15 minutes.`,
    }));

    await step.custom("trigger-llm-summary", async () => {
      return await summaryWorkflow.trigger({
        to: subscriber.subscriberId,
        payload: {
          requests: events.map((e) => e.payload),
        },
      });
    });
  }
);
```

## Skip Delay for Premium Users

Premium users get the email immediately; free users wait 24h.

```typescript
export const upsellWorkflow = workflow(
  "upsell",
  async ({ step, subscriber }) => {
    await step.delay("wait", async () => ({ unit: "hours", amount: 24 }), {
      skip: async () => subscriber.data?.tier === "premium",
    });

    await step.email("upsell", async () => ({
      subject: "Upgrade to unlock more features",
      body: "Try Premium free for 14 days.",
    }));
  }
);
```

## Branch on Custom Step Result

Fetch a task from the database, then conditionally email a reminder.

```typescript
import { db } from "../lib/db";

export const taskReminderWorkflow = workflow(
  "task-reminder",
  async ({ step, payload }) => {
    const task = await step.custom("fetch-task", async () => {
      const t = await db.fetchTask(payload.taskId);

      return { id: t.id, title: t.title, complete: t.complete };
    }, {
      outputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          complete: { type: "boolean" },
        },
        required: ["id", "complete"],
      } as const,
    });

    await step.email("reminder", async () => ({
      subject: `Reminder: ${task.title}`,
      body: "This task is still open.",
    }), {
      skip: () => task.complete,
    });
  },
  {
    payloadSchema: z.object({ taskId: z.string() }),
  }
);
```

## Slack Provider Override (Block Kit)

Use the `chat` step but customize the Slack message with Block Kit.

```typescript
export const deployAlertWorkflow = workflow(
  "deploy-alert",
  async ({ step, payload }) => {
    await step.chat("slack", async () => ({
      body: `Deploy ${payload.deployId} succeeded`,
    }), {
      providers: {
        slack: ({ controls, outputs }) => ({
          text: outputs.body,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: `:white_check_mark: *Deploy ${payload.deployId} succeeded*` },
            },
            {
              type: "context",
              elements: [
                { type: "mrkdwn", text: `Branch: \`${payload.branch}\` • Author: ${payload.author}` },
              ],
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View Build" },
                  url: payload.buildUrl,
                },
              ],
            },
          ],
        }),
      },
    });
  },
  {
    payloadSchema: z.object({
      deployId: z.string(),
      branch: z.string(),
      author: z.string(),
      buildUrl: z.string().url(),
    }),
    tags: ["deploys"],
  }
);
```

## SendGrid CC + Provider Passthrough

```typescript
export const alertWorkflow = workflow(
  "alert",
  async ({ step, payload }) => {
    await step.email("alert", async () => ({
      subject: `[ALERT] ${payload.title}`,
      body: payload.message,
    }), {
      providers: {
        sendgrid: () => ({
          from: "alerts@acme.com",
          cc: ["ops@acme.com", "oncall@acme.com"],
          replyTo: "support@acme.com",
          _passthrough: {
            body: { ip_pool_name: "transactional" },
            headers: { "X-Priority": "1" },
          },
        }),
      },
    });
  },
  {
    payloadSchema: z.object({
      title: z.string(),
      message: z.string(),
    }),
    tags: ["ops", "alerts"],
  }
);
```

## Critical Workflow (Subscribers Cannot Disable)

```typescript
export const securityAlert = workflow(
  "security-alert",
  async ({ step }) => {
    await step.email("notify", async () => ({
      subject: "New login from unrecognized device",
      body: "If this wasn't you, change your password immediately.",
    }));
  },
  {
    preferences: {
      all: { enabled: true, readOnly: true }, // critical — subscribers cannot opt out
    },
    tags: ["security"],
  }
);
```

## In-App Only by Default

In-app is on; subscribers can opt into other channels via Preferences UI.

```typescript
export const newsletter = workflow(
  "weekly-newsletter",
  async ({ step }) => {
    await step.inApp("in-app", async () => ({
      subject: "Weekly digest",
      body: "Read this week's highlights",
    }));

    await step.email("email", async () => ({
      subject: "Weekly digest",
      body: render(<WeeklyDigestEmail />),
    }));
  },
  {
    preferences: {
      all: { enabled: false },
      channels: { inApp: { enabled: true } },
    },
    tags: ["marketing"],
  }
);
```

## Locale-Aware Workflow with i18next

See [translations.md](./translations.md) for the full i18next setup.

```typescript
import i18n from "../translations";

export const localizedWelcome = workflow(
  "welcome-localized",
  async ({ step, subscriber }) => {
    await step.email("send", async (controls) => {
      const t = i18n.getFixedT([subscriber?.locale ?? controls.defaultLocale]);

      return {
        subject: t("welcomeSubject", { name: subscriber.firstName }),
        body: render(<Welcome subject={t("welcomeSubject")} body={t("welcomeBody")} />),
      };
    }, {
      controlSchema: z.object({ defaultLocale: z.string().default("en_US") }),
    });
  }
);
```
