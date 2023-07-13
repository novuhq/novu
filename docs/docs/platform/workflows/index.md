---
sidebar_position: 0
sidebar_label: Workflows
---

import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Workflows

A workflow holds the entire flow of messages sent to the subscriber. This is where all the different `channels`, `actions`, `filters` are tied together under a single entity.

:::info
Please notice notification template has been renamed to `workflow`. Previously, workflow has been referred to as notification template.
:::

Let's explore the different parts of a workflow.

## Workflow Metadata

This will contain general information regarding the notification itself. Let's explore the different aspects of it.

### General Settings

![Workflow General Settings](/img/platform/workflow/general-settings.png)

- **Workflow Name and Identifier**

Each workflow is given a name. Novu generates a slugified unique version of `name` as `identifier`. Two workflow can have same `names` but not the same `identifier`. For example, if workflow name is `Onboarding Notification` then novu will generate identifier as `onboarding-notification`. In case of existing names, a unique id is appended with identifier. For example, if there are two workflows with names `Invites` then first will have identifier as `invites` and second will have `invites-[random-id]` which is always unique. This identifier is most important part of workflow due to its unique nature. `Identifier` is used when we trigger notification.

:::note
When only name of workflow is changed and workflow is updated, identifier is not updated. It has to be updated separately.
:::

- **Workflow Group**

The workflow group is used to group multiple workflows into a single group, currently only used behind the scenes for organizational purposes. But, in the upcoming subscriber preferences management, it will be used to group multiple notifications categories for the subscriber.

- **Workflow Description**

Workflow description is a field that is used to provides a concise and informative summary of the workflow. It highlights key features, specifications, and benefits, assisting other users in understanding the workflow's purpose.

### Channel Settings

![Workflow Channel Settings](/img/platform/workflow/channel-settings.png)

For every workflow, all channels are enabled by default. Subscribers also have all channels enabled in their channel prefererence. Later, subscribers can change their own preference for a particualr template. **Users will be able to manage subscriptions** toggle option makes a template critical, if enabled.
Read more on subscriber preferences and critical template [here](../preferences.md)

## Workflow steps

The workflow steps are nodes. You can add content in `channels` and configure `actions` as per your requirements

Novu supports two type of steps:-

1. **Channels** (in-app, email, push, sms and chat)
2. **Actions** (digest and delay)

![Workflow Steps](/img/platform/workflow/steps.png)

## Trigger

After a workflow is created, a `workflowIdenfier` will be automatically generated for it. `workflowIdentifier` is used to trigger the workflow to subscribers or topics.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.trigger('<WORKFLOW_IDENTIFIER>', {
  to: {
    subscriberId: '111',
    email: 'john.doe@domain.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+13603963366',
  },
  payload: {
    customVariable: 'variableValue',
    organization: {
      logo: 'https://organisation.com/logo.png',
    },
  },
});
```

  </TabItem>
</Tabs>

## Test Workflow

After adding all steps, actions and configuring a workfow, it can be tested using `Run a Test` option. Click on the `Get Snippet` button and then `Run a Test` tab to sending a test notification.

![Test Trigger Workflow](/img/platform/workflow/test-trigger.png)

## FAQ

<FAQ>
<FAQItem title="How to send dynamic HTML content as value of variable?">

Use triple curly braces variable like `{{{htmlVariable}}}`.

</FAQItem>
</FAQ>
