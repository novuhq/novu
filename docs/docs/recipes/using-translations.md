---
sidebar_position: 4
---

# Using translations

Be able to localize your notifications is extremely important in apps where people from all over the world is using it.

In this recipe we will use [i18n-node](https://github.com/mashpie/i18n-node), but it is applicable
to many other translation frameworks.

```typescript
import { NovuStateless, ChannelTypeEnum } from "@novu/stateless";
import { SendgridEmailProvider } from "@novu/sendgrid";
// We will use i18n as a singleton and not as an instance in this recipe
import i18n from 'i18n';

i18n.configure({
  locales: ['en', 'de'],
  directory: path.join(__dirname, '/locales')
})

const novu = new NovuStateless();

await novu.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

// Defined in a file or folder responsible for managing templates
const inviteToOrganizationTemplate = await novu.registerTemplate({
  id: "invite-to-organization",
  messages: [
    {
      // It is important to pass a function here as the template will be stored
      // as soon as you pass it. Passing a function will allow Novu to
      // dynamic fetch the actual value of the translation key, specially
      // if you have changed the locale of i18n dynamicly after
      // registering the template
      subject: () => i18n.__('templates.emails.invite-to-organization.subject'),
      channel: ChannelTypeEnum.EMAIL,
      template: `
          Hi {{firstName}}!
          
          You've been invited by <b>{{inviterName}}</b> to join  <b>{{organizationName}}</b>.
          
          Click <a href="{{inviteLink}}">here</a> to join
      `,
    },
  ],
});

// Triggered in the relevant part of the business logic of your code
await novu.trigger("invite-to-organization", {
  $user_id: "<USER IDENTIFIER>",
  $email: "<USER EMAIL>",
  firstName: "John",
  lastName: "Doe",
  inviterName: "Jannie Doe",
  inviteLink: "https://example.com/invitation?token=123",
  organizationName: "My Org",
});
```

# How to translate my templates?

There are two approaches to translating your templates:

## 1. Store it in a separate folder with each template already translated

You can store the templates in a separte folder with each template already translated:

*templates/inviteOrganization/en.html*
```html
...
<body>
    You have been invited to {{ organizationName }} by {{ inviterName }} 
</body>
...
```

Then just pass the variables to `trigger`:

```js
await novu.trigger("invite-to-organization", {
  $user_id: "<USER IDENTIFIER>",
  $email: "<USER EMAIL>",
  organizationName: "Organization Cool",
  inviterName: "John Doe"
});
```

The advantages of this is that each template can be customized to each language. Imagine you would like to add
`Thank you very much` in the end of the email to every English emails, you are free to do so.

The great disadvantage is that you will duplicate the contents of each template.

## 2. Store a single template

Assuming you have a translation file `en.json`:

```json
{
  "templates.emails.invite-to-organization.title": "You have been invited to {{ organizationName }} by {{ inviterName }} ",
  "templates.emails.invite-to-organization.subject": "You have been invited"
}
```

You can store a single template of your email and pass the translations by key:

*templates/inviteOrganization.html*
```handlebars
<body>
    {{ title }}
</body>
...
```

Then you pass the template directly to Novu:

```js
const inviteOrganizationTemplate = loadFile('templates/inviteOrganization.html');

const inviteToOrganizationTemplate = await novu.registerTemplate({
  id: "invite-to-organization",
  messages: [
    {
      // It is important to pass a function here as the template will be stored
      // as soon as you pass it. Passing a function will allow Novu to
      // dynamic fetch the actual value of the translation key, specially
      // if you have changed the locale of i18n dynamicly after
      // registering the template
      subject: () => i18n.__('templates.emails.invite-to-organization.subject'),
      channel: ChannelTypeEnum.EMAIL,
      template: inviteOrganizationTemplate,
    },
  ],
});
```

and now when you trigger the email you can pass the variables:

```js
// At this time `title` will be the translated string without any mustaches (`{{` or `}}`).
// Novu will still pass your template to handlebars and it will still process
// any leftover mustaches
const titleTranslated = i18n.__n('templates.emails.invite-to-organization.title', {
  organizationName: "Organization Cool",
  inviterName: "John Doe"
})

// Triggered in the relevant part of the business logic of your code
await novu.trigger("invite-to-organization", {
  $user_id: "<USER IDENTIFIER>",
  $email: "<USER EMAIL>",
  title: titleTranslated,
});
```

The advantages of this method is that you only need to manage one template.

The disadvantages of this is that you won't be able to customize a template to a single language.
