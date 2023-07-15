---
sidebar_position: 8
---

# Delay Actions

The delay action awaits a specified amount of time before moving on to trigger the following steps of the workflow.

<iframe width="100%" height="315" src="https://www.youtube.com/embed/kCMB-WdbzJo" title="Delay Action Step - Novu Workflow" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Delay Node

After adding a delay node in the workflow editor, the immediate next step will only be triggered after the specified period of time has elapsed.

## Delay Types

### Regular Delay

Regular Delay will determine how long it will take before triggering the next step.You can specify the amount and time interval unit that best suits your needs.

![Regular Delay](/img/platform/delay/regular-delay.png)

> **Overriding regular delay value**

You can override the default delay time interval you set adding delay action node in workflow.

```typescript
novu.trigger('template-name', {
  to: {
    subscriberId: '123',
  },
  payload: {
    name: 'Hello',
  },
  overrides: {
    delay: {
      unit: 'days',
      amount: 2,
    },
  },
});
```

### Scheduled Delay

Scheduled Delay allows delaying up to a future date before continuation of steps execution. All steps after delay node will be triggered only after said date.

> **Payload Path**

Payload path will determine the path in payload for the scheduled date.
That path must be included in your payload on trigger execution and must be a date in strict ISO format.

![Scheduled Delay](/img/platform/delay/scheduled-delay.png)

```typescript
novu.trigger('workflow-name', {
  to: {
    subscriberId: '123',
  },
  payload: {
    sendAt: '2022-09-21T10:48:44.388Z',
  },
});
```

:::info
Date must be in ISO date format of YYYY-MM-DD**T**hh:mm:ss.SSS**Z**
:::
