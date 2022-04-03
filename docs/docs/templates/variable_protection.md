---
sidebar_position: 6
---

# Variable Protection

If you want to protect missing variables using template, you config `TriggerEngine` with variable protection.
If so, you must provide all variables.


## NovuConfig Interface

```typescript
export interface INovuConfig {
  channels?: {
    email?: {
      from?: { name: string; email: string };
    };
  };
  variableProtection?: boolean;
  templateStore?: TemplateStore;
  providerStore?: ProviderStore;
  themeStore?: ThemeStore;
}
```

## How to config Variable Protection

```typescript
const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();
  const themeStore = new ThemeStore();
  const ee = new EventEmitter();

  const triggerEngine = new TriggerEngine(
    templateStore,
    providerStore,
    themeStore,
    {
      variableProtection: true,
    },
    ee
  );
```

## Example

Here's an example of variable protection.

```typescript
await providerStore.addProvider({
  channelType: ChannelTypeEnum.EMAIL,
  id: 'email-provider',
  sendMessage: () =>
    Promise.resolve({ id: '1', date: new Date().toString() }),
});

await templateStore.addTemplate({
  id: 'test-notification-promise',
  messages: [
    {
      subject: '<div>{{firstName}}</div>',
      channel: ChannelTypeEnum.EMAIL,
      template: () => Promise.resolve('test'),
    },
  ],
});

triggerEngine.trigger('test-notification-promise', {
  $user_id: '12345',
  $email: 'test@gmail.com',
});

// new Error('Missing variables passed. firstName')) 
```

Here's another example when using variables in template

```typescript
await templateStore.addTemplate({
  id: 'test-notification',
  messages: [
    {
      subject: 'test',
      channel: ChannelTypeEnum.EMAIL,
      template: '<div>{{firstName}}</div>',
    },
  ],
});

triggerEngine.trigger('test-notification-promise', {
  $user_id: '12345',
  $email: 'test@gmail.com',
});

// new Error('Missing variables passed. firstName')) 
```
