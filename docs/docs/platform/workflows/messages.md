---
sidebar_position: 2
sidebar_label: Messages
---

# Workflow Messages

A message is particularly tied to a specific channel and will create the content template associated with its channel.

For email channel, you can either use our basic visual editor or a fully custom code with [handlebars variables](https://handlebarsjs.com/guide/).

## Variable usage

To use custom payload variables passed to the template you can use the `{{curly}}` syntax. For example:

```typescript
novu.trigger('workflow-name', {
  payload: {
    name: 'Hello',
    customObject: {
      world: 'World',
    },
  },
});
```

Can be accessed in a workflow directly:

```handlebars
{{name}}! This is our {{customObject.world}}
```

### Iteration

To iterate over an array passed to the trigger endpoint you can use the following syntax:

```typescript
novu.trigger('workflow-name', {
  payload: {
    people: [
      {
        name: 'Person 1 Name',
      },
      {
        name: 'Person 2 Name',
      },
    ],
  },
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

To render a specific block conditionally you can use `#if`:

```handlebars
<div class='entry'>
  {{#if enabledFeature}}
    <h1>You can use superpowers now</h1>
  {{/if}}
</div>
```

### Dateformat

To render a date in a specific format you can use the `dateFormat` helper, which formats the date using `format` function from [date-fns](https://date-fns.org).

```typescript
novu.trigger('workflow-name', {
  payload: {
    date: '2021-01-01',
  },
});
```

```handlebars
<div class='entry'>
  <h1>Mail is sent on {{dateFormat date 'MM/dd/yyyy'}}</h1>
</div>
```
