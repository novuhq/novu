---
sidebar_position: 5
sidebar_label: React
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# React Quickstart

Send notifications across different channels (SMS, Email, Chat, Push) and enable real-time In-App notifications with the help of a rich and customizable Notification Center.

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working React development environment.

You can find the code for this project [here](https://github.com/novuhq/react-quickstart)

## Install Novu React Notification Center Package in your React app

The Novu React package provides a React component library that you can use to add a fully functioning notification center into your React application.

To use it, first install the React Notification Center package by running the following command in your terminal:

```bash
npm install @novu/notification-center
```

Before you can use Novu in your react app, you'll need two things:

1. Create a notification workflow to use for sending notifications, and
2. Create a subscriber - recipients of notifications.

## Create a notification workflow

Before triggering a notification, we need to create a notification workflow. A workflow is like a blueprint that all the notifications are supposed to follow.

> The recipients of a triggered notification are called **subscribers**.

The workflow includes the following:

- Notification workflow name and Identifier
- Channel tailored content:

| Channel | Content Style                                                                                 |
| ------- | --------------------------------------------------------------------------------------------- |
| Email   | 1. Custom Code (HTML) with option to use custom variables via the handlebars , {{ }}, syntax. |
|         | 2. Click and place UI items with the visual workflow editor.                                  |
| SMS     | Text with the option to use handlebars syntax, {{ }} to inject custom variables.              |
| Chat    | Text with the option to use handlebars syntax, {{ }} to inject custom variables.              |
| In-App  | Text                                                                                          |

These are the steps to create a notification workflow:

1. Click **Workflow** on the left sidebar of your Novu dashboard.
2. Click the **Create Workflow** button on the top right.
3. The name of a new notification workflow is currently **"Untitled"**. Rename it to a more suitable title.
4. Select **In-App** as the channel you want to add.

   ![Selecting 'In-App' channel in Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1685465591/guides/untitled-in-app-notification-template_1_ctkdtw.png)

5. Click on the recently added **"In-App"** channel and configure it according to your preferences. Once you're done, click "Update" to save your configuration.

   ![Configuring the In-app channel](https://res.cloudinary.com/dxc6bnman/image/upload/v1685465725/guides/in-app-configuration_1_qzwd93.png)

I'll briefly explain the function of each label in the image above:

- **1-Preview**: Shows you a glimpse of how each notification item will look like in the Notification Center UI.
- **2-Avatar**: If turned on, each notification item will show the avatar of the subscriber.
- **3-Action**: With this, you can add a primary and secondary call to action button to each notification item.
- **4-Notification Feeds**: This displays a stream of specific notifications. You can have multiple feeds to show specific notifications in multiple tabs.
- **5-Redirect URL**: This is the URL to which a subscriber can be directed when they click on a notification item.
- **6-Filter**: This feature allows you to configure the criteria for delivering notifications. For instance, you can apply a filter based on a subscriber's online status to send them an email if they were online within the last hour. Read [more about filters](https://docs.novu.co/platform/step-filter/#subscriber-seen--read-filters).
- **7-Editor**: You can add text that you want displayed in each notification item. Additionally, you can specify custom variables using `{{ }}`. This means you can inject variables from your code into a notification item's text via a payload.

In our case, we'll use the custom variables functionality, as shown below:

![Using custom variables in Novu](https://res.cloudinary.com/dxc6bnman/image/upload/v1688123476/guides/SCR-20230630-oreo_ukmx3i.png)

Feel free to add only text for now and rename the notification workflow to `quickstart`. It automatically creates a slug-like Identifier that will be needed in later steps to trigger a notification.

![Creating a notification workflow from Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688126997/guides/SCR-20230630-pmdf_o3yaae.png)

Now, we’ll learn how to create subscribers on Novu - Recipients of Notifications!

## Create a subscriber

If you click “Subscriber” on the left sidebar of [Novu dashboard](https://web.novu.co/subscribers), you’ll see the subscriber list. By default, there will only be one subscriber as you’re automatically added as a subscriber when you sign up for Novu:

![Subscribers page on the Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127117/guides/SCR-20230630-pmpj_hy4rui.png)

Now, let’s create a subscriber on Novu. After creating a subscriber, we’ll trigger notification to this subscriber. Subscribers are identified by a unique `subscriberId`.

With Novu, you can create a subscriber using any of its SDKs (Node.js, PHP, .NET, Go, Ruby, Python and Kotlin). The code to create a subscriber in Novu is:

<Tabs groupId="language" queryString>

  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<YOUR_NOVU_API_KEY>');

await novu.subscribers.identify('123', {
  firstName: 'Sumit',
  lastName: 'Saurabh',
});
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->createSubscriber([
    'subscriberId' => '123',
    'firstName' => 'Sumit',
    'lastName' => 'Saurabh'
]);
```

  </TabItem>
</Tabs>

You can get your API key from the Novu dashboard. Replace `YOUR_NOVU_API_KEY_HERE` with it. Now, if you’ll go to the Novu dashboard, you shall see the subscriber we created above with `subscriberId` of `123`.

You can also update information about an already existing subscriber using the `subscriber.update` method as shown below:

<Tabs groupId="language" queryString>

  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<YOUR_NOVU_API_KEY>');

await novu.subscribers.update('123', {
  firstName: 'Saurabh', // new first name
  lastName: 'Sumit', // new last name
});
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->updateSubscriber('123', [
    // new firstName
    'firstName' => 'Saurabh',
    // new lastName
    'lastName' => 'Sumit',
])->toArray();
```

</TabItem>
</Tabs>

## Using Novu in a React app

We have already installed the Novu notification center package above. To use it in an app, simply import it and add the component in your React app as follows:

```jsx
import React, { useState } from 'react';
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
} from '@novu/notification-center';

function App() {
  const [description, setDescription] = useState('');
  function onNotificationClick(message) {
    // your logic to handle the notification click
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  return (
    <>
      <NovuProvider
        subscriberId={'<YOUR_SUBSCRIBER_ID>'}
        applicationIdentifier={'<YOUR_NOVU_APPLICATION_IDENTIFIER>'}
        initialFetchingStrategy={{
          fetchNotifications: true,
          fetchUserPreferences: true,
        }}
      >
        <PopoverNotificationCenter
          onNotificationClick={onNotificationClick}
          listItem={(notification) => <div>{notification?.payload?.description}</div>}
        >
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    </>
  );
}

export default App;
```

You'll notice two things used above - `applicationIdentifier` and `subscriberID`.

Application identifier is a public key used to identify your application. You can get your own application identifier from the [Novu dashboard settings](https://web.novu.co/settings).

And subscribers are users to which notifications will be sent. They are identified by a `subscriberID` which you can also find in the [Novu subscribers dashboard](https://web.novu.co/subscribers).

## Trigger a notification

We can trigger a notification by simply running the codesandbox below with the correct credentials.

<iframe width="800" height="450" src="https://codesandbox.io/p/sandbox/exciting-violet-4k6234?embed=1" allowfullscreen></iframe>

This will take the workflow we created above with the identifier `quickstart` and send notification to the subscriber with `subscriberId` of `123`.

> Make sure you're executing this code with the correct credentials.

## Next Steps

Great job! If you've reached this point, you should now have successfully set up the notification center, created a subscriber, notification workflow, configured a channel provider and triggered a notification in your React application.

To learn more about the Notification Center and explore Novu's features and capabilities, check out, check out:

- [Novu Notification Center](https://docs.novu.co/notification-center/web-component#properties) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
