---
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Subscriber Preferences

Novu provides a way to store user preferences in the subscribers data model.
This allows subscribers to specify and manage their preferences, without your intervention. Customizing preferences has become the standard expected behavior for people and Novu can take the technical burden of managing preferences off of you.

Novu allows two levels of preferences:-

- Template level channel preferences
- Subscriber level channel subscription preferences

## Template level channel preferences

When creating a new notification template on the Web platform, you can specify default preferences for the subscribers in channel settings. They will be used unless the subscriber overrides them by his own custom preference.

This will allow you to create sensible defaults but still provide the user with the ability to override them. Template level preference can be managed in channel settings. All channels are `ON` unless specified otherwise.

`Workflow Settings > Channel`

![Template level channel preferences](/img/platform/preferences/template-level-channel-preferences.png)

## Subscriber level channel subscription preferences

Our notification center component will show the user the available preferences, he will be able to modify on the channel level. Critical templates will be excluded from the list. Click on cog (setting) icon on notification center component to open subscriber channel subscription prefrences page.

![User preference in the component](/img/platform/preferences/user-preference.png)

## Exclude templates from preferences (critical template)

In some cases, you don't want the subscriber to be able to unsubscribe from mandatory notifications such as Account Verification, Password Reset, etc...

In those cases you can turn off the toggle `Users will be able to manage subscriptions` in channel settings. Template will become `critical`, once this toggle is turned `OFF`. By default every template is `non-critical` and subscribers can manage channel subscription preferences irrespective of template-level channel preferences. Critical template will not show on the subscriber preferences page.

## Get subscriber preferences

<Tabs groupId="language" queryString>

  <TabItem value="js" label="Node.js">

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.getPreference('subscriberId');
```

  </TabItem>
</Tabs>

## Update subscriber preference for a template

<Tabs groupId="language" queryString>

  <TabItem value="js" label="Node.js">

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.updatePreference('subscriberId', 'templateId', {
  enabled: true,
  channel: {
    in_app: true,
    email: true,
    push: true,
    sms: false,
    chat: false,
  },
});
```

  </TabItem>
</Tabs>

## Order of priority of preferences

1. if `Users will be able to manage subscriptions` toggle is turned off i.e template is critical, this will override template level and subscriber level preferences and notification will always be sent.
2. if template is non critical and subscriber has `false` value set for `enabled` field in preference then all other channels will become inactive even if they have `true` state.
3. if template is non critical and subscriber has `true` value set for `enabled` field in preference then notification will be filtered based on subscriber channel preference.
4. Template level channel preferences will be applied to all subscribers by default unless subscriber overrides them.

`Example`

:::info

Only channels with a matched step will be returned from the API. In case no channel content was found, the API will return an empty array.

:::
