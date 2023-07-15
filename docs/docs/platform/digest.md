---
sidebar_position: 6
---

# Digest Engine

The digest engine collects multiple trigger events, aggregates them into a single message, and delivers it to the subscriber. Another name of the digest can be `batch`.

This becomes useful when a user needs to be notified of many activities and you don't want to send notifications for each activity. Novu will batch the incoming trigger events based on the `subscriberId` by default and an **optional** `digestKey` that can be added to control the digestion of the events.

## Digest Node

After adding a digest node in the workflow editor, each node that will be below the digest node will be only triggered once in the specified digest interval.

In the below image workflow, there are two nodes (`email` and `sms`) after the digest node and one node (`in-app`) before the digest node in the workflow. For this workflow, if we trigger 10 events within the digest interval, the `in-app` step will be executed 10 times, and `email` and `sms` will be executed only 1 time with digested events data.

![Workflow Photo](/img/platform/digest/digest-nodes.png)

## Digest Key

By default, Novu digests events based on the `subscriberId`. Users can use a single or group of custom keys. More than one key can be written as comma-separated words. With custom keys, Novu will digest events on the basis of the combination of subscriberId and all custom keys. Custom keys can be nested as well as non-nested.

In the below image, `author.name` is a nested key, and `postId` is a non-nested key. When this workflow is triggered, the payload must contain `author.name` and `postId` fields to aggregate digest events based on these keys.

![Custom Digest Keys](/img/platform/digest/custom-digest-keys.png)

## Digest Types

### Regular Digest

Regular Digest digests events for specified time interval. After the time interval is complete, the digest node forwards digested events to the next node. Here, in the below example image, `2` is the `interval amount`, and `mins` is the `interval unit`. Interval units can be sec(s), min(s), hour(s), or day(s).

![Regular Digest](/img/platform/digest/regular-digest.png)

:::info
If you create a digest with 8 hours digest interval and then trigger a few events a new digest will be created that will digest events for the next 8 hours. Now before 8 hours, you reduce digest interval to 2 minutes. Now new events will still merge with the previous 8 hours digest because even after changing the interval to 2 minutes, that old 8 hours digest is still active. You have to cancel the first event using [this API](https://docs.novu.co/api/cancel-triggered-event/) to remove that 8 hours digest. **Use short duration time interval for digest testing purposes**.
:::

### Backoff Digest

Backoff digest has two intervals `digest interval` and `backoff interval`. Here, in the below image, the `digest interval` is 20 minutes, and the `backoff interval` is 15 minutes. In the case of a backoff digest, first, it is checked if any event is triggered within the past backoff interval, only then a digest is created for the digest interval. If not, the event is considered non-digest and workflow execution continues to the next step.

![Backoff Digest](/img/platform/digest/backoff-digest.png)

`Example:`

Let's set the digest interval as 20 minutes and the backoff time as 15 minutes.

If we trigger the first event. Since it is the first event and there was no event triggered in the past 15 minutes (backoff interval), this event will be executed as it is (without digest).

Now, if we trigger a second within 15 minutes, then a new digest will be created with this second event. From now onwards till 20 minutes (digest interval), all triggers will be digested in this digest, and after 20 minutes, the workflow will carry forward to the next step with digested events.

### Scheduled Digest

- **Minutes**

It digests events for every specified minutes. For example, as per the below image, events will be digested for 20 minutes and after 20 minutes, workflow will carry forward to the next step. It will be repeated after every 20 minutes.

![Scheduled Digest Min](/img/platform/digest/scheduled-digest-min.png)

- **Hour**

It digests events for given hours. After given hours, a new digest is created.

![Scheduled Digest Hour](/img/platform/digest/scheduled-digest-hour.png)

- **Daily**

It digests events for specified days till given time. After those days and time, a new digest is created and events are digested in this new digest.

:::info
Time is in UTC timezone for the `daily`, `weekly`, and `monthly` scheduled digest.
:::

![Scheduled Digest Daily](/img/platform/digest/scheduled-digest-daily.png)

- **Weekly**

It digests events for specified weekdays. Only at the specified time, the workflow continues to the next step after the digest step. A new digest is created and events are digested in this new digest till these weeks and time.

![Scheduled Digest Weekly](/img/platform/digest/scheduled-digest-weekly.png)

- **Monthly**

![Scheduled Digest Monthly](/img/platform/digest/scheduled-digest-monthly.gif)

## Writing digest templates

In many cases, you will need to access all the digested events payload in order to show the user all or parts of the events included in this digest. For example: **John and 5 others liked your photo.**

As part of the digested template, you will have access to these properties:

| Property           | Description                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step.events`      | An array of all the events aggregated under this digest. This will be the "payload" object passed to each `trigger.event` sent in the digest period |
| `step.total_count` | The number of total events in this digest                                                                                                           |
| `step.digest`      | A `boolean` flag to indicate if we are in a digest mode right now                                                                                   |

Let's look at a handlebars syntax example for the following triggers:

```typescript
novu.trigger('workflow-name', {
  to: '123',
  payload: {
    name: 'Hello',
  },
});

novu.trigger('workflow-name', {
  to: '123',
  payload: {
    name: 'World',
  },
});
```

After these two triggers, digest variables are as follows:

| Property           | Value                                         |
| ------------------ | --------------------------------------------- |
| `step.events`      | [ { "name" : "Hello" }, { "name": "World" } ] |
| `step.total_count` | 2                                             |
| `step.digest`      | true                                          |

Using the following template:

```handlebars
Total events in digest:
{{step.total_count}}

{{#if step.digest}}
  {{#each step.events}}
    <div>This is {{name}} payload event</div>
  {{/each}}
{{else}}
  Not a digested template
{{/if}}
```

It will renders as :

```html
Total events in digest: 2 This is Hello payload event This is World payload event
```

Note that if only one matching trigger activates a regular digest during its period, that single item will still come through as a digest with `step.total_count` as 1.
