---
sidebar_position: 8
---

# Delay Actions

The delay action awaits a specified amount of time before moving on to trigger the following steps of the workflow.

## Delay Node

After adding a delay node in the workflow editor, the immediate next step will only be triggered after the amount of time specified elapses.

### Node configurations

#### Time Interval

Will determine how long the wait will be before triggering the next step. You can specify the amount and the unit that best suites your needs.

Should you wish to, you could override the default delay time interval you set in the creation of the delay node.

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
