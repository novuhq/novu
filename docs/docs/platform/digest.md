---
sidebar_position: 5
---

# Digest Engine

The digest engine collects multiple trigger events, aggregates them into a single message and delivers it to the subscriber.

This becomes useful when a user needs to be notified on a large amount of triggers and you want to avoid sending too many notifications. Novu will automatically batch the incoming trigger events based on the `subscriberId` and an **optional** `digestKey` that can be added to control the digestion of the events.

## Digest Node

After adding a digest node in the workflow editor, each node that will be below the digest node will be only triggered once in the specified digest interval. You can decide to send messages before adding a digest node and they will be triggered in real-time.

![Workflow Photo](/img/digest-flow.png)

### Node configurations

#### Time Interval

Will determine how long the digest engine will wait before sending the message once created. You can specify the amount and the unit that best suits your needs.

#### Digest Key

If specified, the digest engine will group the events based on the `digestKey` and `subscriberId`, otherwise the digest engine will group the events based only on the subscriberId.

The digest key might come useful when you want a particular subscriber to get events grouped on a custom field. For example when an actor likes the user's post, you might want to digest based on the `post_id` key.

#### Strategy

The strategy which Novu should use handle the digest step. More details on available strategies below.

## Strategies

Novu allows you to define different digest strategies depending on the actual use-case you are trying to achieve. At this point we allow you to select from 2 strategies:

- Regular Strategy
- Back-off Strategy

Let's explore them in detail:

### Regular Strategy

In regular strategy, a digest will always be created for the specified window time. Which means that from the first event trigger, if no active digest exists for this subscriber, one will be created and the user will receive the message only when the digest window time is reached.

### Back-off Strategy

In the back-off strategy, before creating a digest, Novu will check if a message was sent to the user in the back-off period. If a message was sent, a digest will be created. Otherwise, a message will be sent directly to the user and the digest creation will be skipped.

## Writing digest templates

In many cases, you will need to access all the digested events payload in order to show the user all or parts of the events included in this digest. For example: "John and 5 others liked your photo."

As part of the digested template, you will have access to a few properties:

| Property           | Description                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step.events`      | An array of all the events aggregated under this digest. This will be the "payload" object passed to each `trigger.event` sent in the digest period |
| `step.total_count` | The number of total events in this digest                                                                                                           |
| `step.digest`      | A `boolean` flag to indicate if we are in a digest mode right now                                                                                   |

Let's look at a handlebars syntax example for the following triggers:

```typescript
novu.trigger('template-name', {
  to: '123'
  payload: {
    name: 'Hello'
  }
});

novu.trigger('template-name', {
  to: '123'
  payload: {
    name: 'World'
  }
});
```

Using the following template:

```handlebars
Total events in digest:
{{step.total_count}}

{{#if step.digest}}
  {{#each step.events}}
    {{name}}
  {{/each}}
{{else}}
  Not a digested template
{{/if}}
```
