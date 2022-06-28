---
---

# Subscribers

Novu manages your users in a specific subscribers data model, that allows the Novu API to manage different aspects of the notification flow while providing an easy interface for triggering notifications.

A novu subscribers contains the following data points:

- **User data** - data stored on the subscriber object that allows you easily access it in the notification templates you create. This contains basic info such as name, gender, profile picture and etc...
- **Contact information** - Things like e-mail, phone number, push tokens and etc... They will be used when a multi-channel template will be configured. Managing all communication credentials will reduce the amount of data you need to pass when triggering a notification.

## Creating a subscriber

When you want to send a notification to a specific recipient in the Novu platform, you must first create a subscriber using our server SDK.

```typescript
import { Novu } from '@novu/node'

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.identify(user.id, {
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.profile_avatar
});
```

Novu will create a subscriber if one does not exist, and will update existing subscribers based on the identify payload. You can call this function during registration or signup to make sure the subscriber data is up to date.

### Subscriber identifier

This is a unique identifier used by Novu to keep track of a specific subscriber. We recommend using the internal id you application uses for a specific users.
Using an identifier like email might cause issues locating a specific subscriber once they change their email address.

### Updating subscriber data

In some cases you want to access subscribers to update a specific field or data attribute. For example when user changes their email address or personal details.

```typescript
import { Novu } from '@novu/node'

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.update(user.id, {
  email: user.email
});
```

### Removing a subscriber

To remove and stop a subscriber from receiving communication, you call the remove API to delete the subscriber.

```typescript
import { Novu } from '@novu/node'

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.remove(user.id);
```
