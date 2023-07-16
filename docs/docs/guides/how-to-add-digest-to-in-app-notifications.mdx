---
sidebar_position: 1
sidebar_label: How to Add Digest to In-App Notifications
---

# How to Add Digest to In-App Notifications

## Introduction

In this guide, you’ll learn how to add digest notifications to a React app. But before exploring the actual code, let’s understand what a digest notification is and how it works.

You can find the entire code(frontend as well as backend) for this app [here](https://github.com/novuhq/digest-learning-app/tree/main).

### What is a Digest Notification?

Often times when you associate notifications with user activity, the end user can be bombarded with messages because of the nature of the activity. Take for example the case of commenting in the context of a social media app. If you were to send a notification to a user for every comment they receive, and they happen to receive 100 comments, it could lead to user fatigue since you would have to send 100 messages.

This is where digest notifications come into the picture!

A digest notification is a notification that consolidates information from several notifications into one and delivers that notification to the end user instead of several separate messages.

### How does Digest Notification Work?

Novu has a built-in digest engine that collects multiple trigger events, aggregates them into a single message and delivers it to the subscriber. You can use the digest engine by adding a ‘digest node’ to your workflow in the workflow editor in the [Novu dashboard](https://web.novu.co/workflows). If you want to learn more about it, [this](https://docs.novu.co/platform/digest/) is a great place to start.

Let’s see it in action now!

## Add Digest Notification To An App

To get started with this, you need the following:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working React development environment.

## Workflow setup in Novu

Once, you have these, follow the steps below:

1. Head over to the Novu Dashboard.
2. Click “Workflows” on the left sidebar of your Novu dashboard.
3. Click the “Create Workflow” button on the top right:

![Create workflow on Novu web dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127676/guides/SCR-20230630-pqdm_z5npqe.png)

Once you click the ‘create workflow’ button, you’ll see a dropdown. Select ‘blank workflow’ from the dropdown:

![select blank workflow in dropdown](https://res.cloudinary.com/dxc6bnman/image/upload/v1688131596/guides/Screenshot_2023-06-25_at_10.54.37_PM_cstufw.png)

You’ll now be taken to the workflow editor:

![workflow editor in Novu workflow editor](https://res.cloudinary.com/dxc6bnman/image/upload/v1688131696/guides/Screenshot_2023-06-25_at_10.56.11_PM_b7fc7i.png)

Once here, you can add the channels you want to use for sending notifications and configure them. For this guide, we’ll use the ‘In-App’ channel. You’ll also see the ‘Digest’ action on the right sidebar.

Note: Each node that is added below the digest node will only be triggered after the specified time interval

For example, in our case, say we want the In-App notification to be sent after every 6 hours. Next, add the 'digest' action below the 'trigger node', and add the 'in-app' channel node below the 'digest' node as shown below:

![Add digest action below the trigger node and in-app channel node below the digest node](https://res.cloudinary.com/dxc6bnman/image/upload/v1688131735/guides/Screenshot_2023-06-25_at_11.01.23_PM_vsvrjh.png)

The 'digest' node allows you to set a specific time interval for when notifications should be sent:

![Configure the time interval in the digest node](https://res.cloudinary.com/dxc6bnman/image/upload/v1688131926/guides/Screenshot_2023-06-25_at_11.02.17_PM_vsmjg9.png)

Once, you’ve configured it. Go ahead and configure the ‘in-app’ channel as per your need:

![Various options in the in-app channel](https://res.cloudinary.com/dxc6bnman/image/upload/v1688132220/guides/SCR-20230630-qqbi_nqftzz.png)

Here’s a brief explanation of all the options:

- **1-Preview**: This shows you a glimpse of what each notification item will look like in the Notification Center UI.
- **2-Avatar:** If turned on, each notification item will show the avatar of the subscriber.
- **3-Action:** With this, you can add a primary and secondary call to action button to each notification item.
- **4-Notification Feeds:** This displays a stream of specific notifications. You can have multiple feeds to show specific notifications in multiple tabs.
- **5-Redirect URL** - This is the URL to which a subscriber can be directed when they click on a notification item.
- **6-Filter** - This feature allows you to configure the criteria for delivering notifications. For instance, you can apply a filter based on a subscriber's online status to send them an email if they were online within the last hour. Read [more about filters](https://docs.novu.co/platform/step-filter/#subscriber-seen--read-filters).

In our case, we’re going to use the following:

![handlebar code that we're going to use](https://res.cloudinary.com/dxc6bnman/image/upload/v1688132428/guides/SCR-20230630-qsjg_xl4kk9.png)

Once you’re done configuring this to your liking, click on the ‘update’ button on the top right. You can read more about it [here](https://docs.novu.co/platform/digest/#writing-digest-templates)

It’ll automatically create a trigger code that you can use in your app. To get it, click on the ‘get snippet’ button on the top right and copy it:

![code snippet to trigger ](https://res.cloudinary.com/dxc6bnman/image/upload/v1688132689/guides/Screenshot_2023-06-25_at_11.19.29_PM_wruvxs.png)

Now, let’s see how to add Novu to our app!

## Add Novu to the Backend and Configure it

In your backend, install the novu package using the following code:

```bash
npm install @novu/node
```

Now, create a route which you want to hit when called from the front end. In our demo app, this is the route:

```jsx
import express from 'express';
import { getDigest } from '../controller/digest.js';

const router = express.Router();

router.post('/sending-digest', getDigest);

export default router;
```

Now, we need to write a controller function that will handle the logic for what is to be sent in the trigger function’s payload. In our case, this is the controller function:

```jsx
import { sendDigest } from '../novu/novu.js';

export const getDigest = async (req, res) => {
  const { name } = req.body;
  try {
    await sendDigest(name);
    res.status(201).json({ message: 'success', name: name });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
```

To make it modular, we’ll keep the trigger code in a separate function in a separate file (’novu.js’, in our case) and the trigger function is getting called in the controller function above by the name ‘getDigest’.

If you’re following the guide, you’ve already copied the trigger function. But before we can add it to our app, we need one key thing - Subscribers.

Subscribers are entities to which the notifications are sent. You can see a list of subscribers in the [Novu dashboard](https://web.novu.co/subscribers) as well.

In our app, we’ll create a subscriber in Node.js as we’re writing our backend in Node.js, but we also have backend SDKs (Node.js, PHP, .NET, Go, Ruby, Python and Kotlin) to choose from. The recommended way to create a subscriber in NodeJS is as follows:

```jsx
await novu.subscribers.identify('aa234u787', {
  firstName: 'digest subscriber',
});
```

Here, we’re creating a subscriber with the `subscriberID` of `aa234u787.` You can read more about subscribers [here](https://docs.novu.co/platform/subscribers/).

Back in our app, we can now add the trigger function:

```jsx
import { Novu } from '@novu/node';

export const sendDigest = async (name) => {
  const novu = new Novu(process.env.YOUR_NOVU_API_KEY_HERE);

  await novu.subscribers.identify('aa234u787', {
    firstName: 'digest subscriber',
  });

  await novu.trigger('digest-showcase', {
    to: {
      subscriberId: 'aa234u787',
    },
    payload: {
      name: name,
    },
  });
};
```

Now, we just need to hit the route defined above from the front end and add Novu to it.

## Add Novu’s Notification Center to the front end

In the front end, install the Novu notification centre package using the following command:

```bash
npm install @novu/notification-center
```

Now, import and render the component in your app. The code to do so is as follows:

```jsx
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
  IMessage,
} from '@novu/notification-center';

function Header() {
  function onNotificationClick(message: IMessage) {
    // your logic to handle the notification click
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  return (
    <NovuProvider subscriberId={'USER_ID'} applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}>
      <PopoverNotificationCenter onNotificationClick={onNotificationClick}>
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
```

You can, of course, modify things as you need. For example, in our app, this is what we’ve done in the header:

```jsx
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
} from '@novu/notification-center';
import '../css/Header.css';

const Header = () => {
  function onNotificationClick(message) {
    // your logic to handle the notification click
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }
  return (
    <div className="bell">
      <div className="intro">
        <h1 className="title">Play with the digest engine!</h1>
        <p className="desc">
          Don't know how to? Start <a href="https://docs.novu.co/platform/digest/">here</a>.
        </p>
      </div>
      <div className="center">
        <NovuProvider
          subscriberId={'aa234u787'}
          applicationIdentifier={process.env.REACT_APP_YOUR_APP_ID_FROM_ADMIN_PANEL}
        >
          <PopoverNotificationCenter onNotificationClick={onNotificationClick}>
            {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
          </PopoverNotificationCenter>
        </NovuProvider>
      </div>
    </div>
  );
};

export default Header;
```

You’ll also need to plug in your `applicationIdentifier`. You can get your `application id` from the settings menu in the Novu dashboard.

Beyond this, we just need to call the API we had written above when the form is submitted with the data we want in the payload. The code to do so is as follows:

```jsx
import { useState } from 'react';
import axios from 'axios';
import '../css/Body.css';

const Body = () => {
  const [name, setName] = useState('');

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    const res = await axios.post('http://localhost:3000/api/v1/sending-digest', { name });
    setName('');
  };
  const onChangeHandler = (e) => {
    setName(e.target.value);
  };
  return (
    <form onSubmit={onSubmitHandler} className="form">
      <label for="noti-text" className="label">
        Enter notification text:
      </label>
      <input
        id="noti-text"
        placeholder="Will be sent as a digest message"
        type="text"
        onChange={onChangeHandler}
        value={name}
        className="text"
      />
      <button className="btn" type="submit">
        {' '}
        Send{' '}
      </button>
    </form>
  );
};

export default Body;
```

The app is done now!

Congratulations for following the guide up until this point. We can style our app a little using [some CSS](https://github.com/novuhq/digest-learning-app/blob/main/frontend/src/App.css).

If you’ve done everything as recommended, you’ll end up with an app that looks like this:

![out.gif](https://res.cloudinary.com/dxc6bnman/image/upload/v1688130966/guides/out_ca2bjr.gif)

In this app, when we enter some text in the input box and click send, the notification appears in the bell icon after the delay specified above (when we’re creating the workflow).
