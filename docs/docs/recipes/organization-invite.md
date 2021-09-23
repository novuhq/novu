---
sidebar_position: 5
---

# Organization Invite

In a collaborative project, you may want to invite others to join the organization.

```typescript
import { Notifire, ChannelTypeEnum } from "@notifire/core";
import { SendgridEmailProvider } from "@notifire/sendgrid";

const notifire = new Notifire();

await notifire.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

// Defined in a file or folder responsible for managing templates
const inviteToOrganizationTemplate = await notifire.registerTemplate({
  id: "invite-to-organization",
  messages: [
    {
      subject: "You've been invited to join {{organizationName}}",
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
await notifire.trigger("invite-to-organization", {
  $user_id: "<USER IDENTIFIER>",
  $email: "<USER EMAIL>",
  firstName: "John",
  lastName: "Doe",
  inviterName: "Jannie Doe",
  inviteLink: "https://example.com/invitation?token=123",
  organizationName: "My Org",
});
```
