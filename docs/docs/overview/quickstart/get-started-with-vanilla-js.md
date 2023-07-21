---
sidebar_position: 8
sidebar_label: Vanilla JS
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Vanilla JS Quickstart

Learn how to integrate Novu into your vanilla JS app on the fly. Send notifications across different channels (SMS, Email, Chat, Push) and enable real-time In-App notifications with the help of a rich and customizable Notification Center.

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working Vanilla JS development environment.

You can find the code for this project [here](https://github.com/novuhq/vanillajs-quickstart)

## Loading Notification center component from the CDN

The Notification Center Web Component is a custom element that can be used in any web application.

You can find out more about the web component [here](https://docs.novu.co/notification-center/web-component/).

In our case, we'll be using the bundled version of the Notification Center Web Component that is available on the CDN.

You can load the Notification center component using the CDN as follows:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    ...
    <!-- CDN link for Novu notification center component -->
    <script src="https://novu-web-component.netlify.app/index.js"></script>
  </head>
  <body>
    <!-- HTML body -->
    <!-- the notification center -->
    <notification-center-component
      style="display: inline-flex"
      application-identifier="<YOUR_APPLICATION_IDENTIFIER>"
      subscriber-id="<YOUR_SUBSCRIBER_ID>"
    ></notification-center-component>
  </body>
</html>
```

You'll notice the use of two things in the above code - `application-identifier` and `subscriber-id`.

Application identifier is a public key used to identify your application. You can get your own application identifier from the [Novu dashboard settings](https://web.novu.co/settings).

And subscribers are users to which notifications will be sent. They are identified by a `subscriberID` which you can also find in the [Novu subscribers dashboard](https://web.novu.co/subscribers). Let's learn more about subscribers.

## Subscribers in Novu

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
  returnUser: true,
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

1. Click **Workflows** on the left sidebar of your Novu dashboard.
2. Click the **"Create Workflow"** button on the top right.
3. The name of a new notification workflow is currently **"Untitled"**. Rename it to a more suitable title.
4. Select **"In-App"** as the channel you want to add.

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

![Using custom variables in Novu](https://res.cloudinary.com/dxc6bnman/image/upload/v1688129401/guides/SCR-20230630-qajs_ac1jol.png)

Feel free to add only text for now and rename the notification workflow to `quickstart`. It automatically creates a slug-like Identifier that will be needed in later steps to trigger a notification.

![Creating a notification workflow from Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688129550/guides/SCR-20230630-qbjj_rfuxa1.png)

Having created a notification workflow and having our `subscriberID`, we're ready to send notifications using Novu!

## Using Novu in a vanilla JS app

We have already used the CDN to get the notification center component and we already have all the credentials that we need. To use it in an app, simply use the `notification-center-component` in your html file as shown below.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    ...
    <!-- CDN link for Novu notification center component -->
    <script src="https://novu-web-component.netlify.app/index.js"></script>
  </head>
  <body>
    <notification-center-component
      style="display: inline-flex"
      application-identifier="<YOUR_APPLICATION_IDENTIFIER>"
      subscriber-id="<YOUR_SUBSCRIBER_ID>"
    ></notification-center-component>

    <script>
      // here you can attach any callbacks, interact with the web component API
      // You can also move this to a seperate js file and have all the callbacks and other logic there
      let nc = document.getElementsByTagName('notification-center-component')[0];
      nc.onLoad = () => console.log('hello world!');
    </script>
  </body>
</html>
```

You can add all the logic you want to add to the `script` element at the bottom or move it all into a seperate JavaScript file (don't forger to link to the JavaScript file in this case).

Here's an example of such an HTML file:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://novu-web-component.netlify.app/index.js"></script>

    <title>Vanilla JS app</title>
  </head>

  <body>
    <div>
      <h1>Notification generator</h1>
      <notification-center-component
        style="display: inline-flex"
        application-identifier="<YOUR_NOVU_APPLICATION_IDENTIFIER>"
        subscriber-id="123"
      ></notification-center-component>
    </div>
    <div class="">
      <form action="#" method="post" class="form">
        <input class="input" placeholder="Enter notification text" type="text" name="description" />
        <button class="btn">Send</button>
      </form>
    </div>
  </body>
  <script src="./app.js"></script>
</html>
```

And the corresponding script file is as follows:

```javascript
const btn = document.querySelector('.btn');
const input = document.querySelector('.input');
const form = document.querySelector('.form');

const onClickHandler = async (e) => {
  e.preventDefault();
  const desc = input.value;
  console.log(desc);
  try {
    const resp = await fetch('<The API route from your backend>', {
      method: 'POST',
      body: JSON.stringify({
        description: desc,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    input.value = '';
    console.log(resp);
  } catch (err) {
    console.log(err);
  }
};

form.addEventListener('submit', onClickHandler);

// here you can attach any callbacks, interact with the web component API
let nc = document.getElementsByTagName('notification-center-component')[0];
nc.onLoad = () => console.log('hello world!');
```

The front-end as well as the back-end code for the sample application can be found [here](https://github.com/novuhq/vanillajs-quickstart) for illustration.

## Code to trigger the notification

We can trigger a notification by simply executing the trigger code snippet we get from the Novu web dashboard.

To get the snippet:

1. Go to **Workflows** in the left sidebar on Novu web dashboard.
2. Select the workflow.
3. Click the **Get Snippet** button on the top right.

Here's the trigger snippet you'll receive:

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<API_KEY>');

novu.trigger('quickstart', {
  to: {
    subscriberId: '<REPLACE_WITH_DATA>',
  },
  payload: {
    description: '<REPLACE_WITH_DATA>',
  },
});
```

> Make sure you're executing this code with the correct credentials.

## Next Steps

Great job! If you've reached this point, you should now have successfully set up the notification center, created a subscriber, notification workflow, configured a channel provider and triggered a notification in your React application.

To learn more about the Notification Center and explore Novu's features and capabilities, check out, check out:

- [Novu Notification Center](https://docs.novu.co/notification-center/web-component#properties) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
