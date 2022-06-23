# Templates

A template holds the entire flow of messages sent to the subscriber. This is where all the different channels are tied together under a single entity.

Let's explore the different parts of a notification template

## Global template metadata

This will contain general information regarding the notification itself. Let's explore the different aspects of it.

### Notification name

The name will be used to identify the notification template when triggering it. A slugified version of the name will be generated after the notification was created. For example a notification template with the name of "Test Notification" will be converted to "test-notification" as the trigger key.

### Notification Group

Used to group multiple notification templates to a single group, currently only used behind the scenes for organisational purposes. But in the upcoming subscriber preferences management will be used to group multiple notifications for the subscriber.

## Template steps

The templates steps are used to organization the different messages in a particular flow. You can add messages for multiple channels and in the upcoming workflow editor release you will be able to configure custom flows that including actions like: Delay, Digest and other conditional steps.

## Messages

A message is particularly tied to a specific channel and will create the content template associated with its channel.

For email channel you can either use our basic visual editor or a fully custom code with [handlebars variables](https://handlebarsjs.com/guide/).

### Variable usage

To use custom payload variables passed to the template you can use the `{{curly}}` syntax for example:

```typescript
 novu.trigger('template-name', {
   payload: {
     name: 'Hello',
     customObject: {
       world: 'World'
     }
   }
});
```

Can be accessed in a template directly:

```handlebars
{{name}}! This is our {{customObject.world}} 
```

### Iteration

To iterate over an array passed to the trigger endpoint you can use the following syntax

```typescript
 novu.trigger('template-name', {
   payload: {
     people: [{
       name: 'Person 1 Name'
     }, {
       name: 'Person 2 Name'
     }]
   }
});
```

```handlebars
<ul>
  {{#each people}}
    <li>{{name}}</li>
  {{/each}}
</ul>
```

### Conditional

To render a specific block conditionally you can use the `#if`

```handlebars
<div class="entry">
  {{#if enabledFeature}}
    <h1>You can use superpowers now</h1>
  {{/if}}
</div>
```

## Trigger

After a notification template will be created a trigger key will be automatically generated for it. To use the trigger you can install the server side sdk with:

```bash
  npm install @novu/node
```

To use the API you first need to get a Novu API Key. You can get it from the `Settings` page in the admin panel.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>',
  {
    to: {
      subscriberId: '<USER_IDENTIFIER>',
      email: 'test@email.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    payload: {
      customVariables: 'Test',
      organization: {
        logo: 'https://evilcorp.com/logo.png',
      },
    },
  }
);
```
