---
sidebar_position: 1
---

# Trigger

After a notification template is created, a trigger key will be automatically generated for it.

You can use the trigger endpoint to send a notification to:

- Single subscriber
- Multiple subscribers
- Group of subscriber using Topics
- Multiple groups of recipients using Topics
- A combination of the above

When sending a trigger, Novu will process the request, fan-out when necessary and may or may not send messages to the subscribers based on the workflow configuration.

## The trigger endpoint

This is the main place that you will be using when sending notifications to your users.
Let's explore the different aspects of it:

```typescript
await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>', {
  to: {
    subscriberId: '<USER_IDENTIFIER>',
    email: 'test@email.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  payload: {
    customVariables: 'Test',
    lists: ['list1', 'list2'],
    organization: {
      logo: 'https://evilcorp.com/logo.png',
    },
  },
  actor: {
    subscriberId: '<USER_IDENTIFIER>',
    email: 'test@email.com',
  },
  overrides: {
    fcm: {},
  },
});
```

Let's break it down piece by piece:

### The recipients of the notification aka `to`

This property includes the information about the recipients of the notification. You can send a notification to a single subscriber or multiple subscribers.

Novu will

### Actor

### Payload

### Overrides
