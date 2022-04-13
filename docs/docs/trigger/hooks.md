---
sidebar_position: 7
---

# Hooks

Hooks are part of the notification trigger configuration. Hooks are scripts that run automatically every time a particular event occurs. They let you customize internal behavior and trigger customizable actions at key points in the life cycle.

The hooks gives an ability to get notified after and before a message was sent. This can be helful for logging purposes and running custom scripts.

There are two methods of hooks:

 - **Pre Hook**, is executed before sending the message. 

 - **Post Hook**, is executed after sending the message.

Here's an example with Pre and Post Hook:

```typescript
const novu = new NovuStateless();

// Pre hook usage
novu.on('pre:send', (data) => {
     const {
      id,
      channel,
      message,
      triggerPayload,
    } = data;
});

// Post hook usage
novu.on('post:send', (data) => {
     const {
      id,
      channel,
      message,
      triggerPayload,
    } = data;
});

```
