---
sidebar_position: 2
sidebar_label: How to Add Digest to Email Notifications
---

# How to Add Digest to Email Notifications

## Introduction

In this guide, you’ll learn how to add digest functionality to email notifications. But before exploring the actual code, let’s understand what a digest notification is and how it works.

You can find the entire code(frontend as well as backend) for this app [here](https://github.com/novuhq/digest-email-app).

:::info
If, instead, you want to add digest to in-app notifications, we have a guide for that as well. Take a look [here](https://docs.novu.co/guides/how-to-add-digest-to-in-app-notifications).
:::

### What is a Digest Notification?

Often when you associate notifications with user activity, the end user can be bombarded with messages because of the nature of the activity. Take for example the case of commenting in the context of a social media app. If you were to send a notification to a user for every comment they receive, and they happen to receive 100 comments, it could lead to user fatigue since you would have to send 100 messages.

This is where digest notifications come into the picture!

A digest notification is a notification that consolidates information from several notifications into one and delivers that notification to the end user instead of several separate messages.

### How does Digest Notification Work?

Novu has a built-in digest engine that collects multiple trigger events, aggregates them into a single message, and delivers it to the subscriber. You can use the digest engine by adding a ‘digest node’ to your workflow in the workflow editor in the [Novu dashboard](https://web.novu.co/workflows). If you want to learn more about it, [this](https://docs.novu.co/platform/digest/) is a great place to start.

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

Once here, you can add the channels you want to use for sending notifications and configure them. For this guide, we’ll use the ‘Email’ channel. You’ll also see the ‘Digest’ action on the right sidebar.

:::info
Note: Each node that is added below the digest node will only be triggered after the specified time interval
:::

For example, in our case, say we want the email notification to be sent after every 6 hours. So, add the 'digest' action below the 'trigger node', and add the 'email' channel node below the 'digest' node as shown below:

![Add digest action below the trigger node and email channel node below the digest node](https://res.cloudinary.com/dxc6bnman/image/upload/v1689095077/guides/Screenshot_2023-07-11_at_10.33.23_PM_peyqdm.png)

The 'digest' node allows you to set a specific time interval for when notifications should be sent:

![Configure the time interval in the digest node](https://res.cloudinary.com/dxc6bnman/image/upload/v1689095225/guides/Screenshot_2023-07-11_at_10.36.48_PM_wslpsu.png)

Once, you’ve configured it. Go ahead and configure the 'email’ channel as per your need:

![Various options in the email channel](https://res.cloudinary.com/dxc6bnman/image/upload/v1689095875/guides/SCR-20230711-tprk_yjit6u.png)

Here’s a brief explanation of all the options:

- **1-Preview:** This shows you a glimpse of what the email notification item will look like when delivered to the client.
- **2-Sender Name:** Lets you set the sender name for emails that the client will receive.
- **3-Subject:** This lets you define the subject line for the emails that the client will receive.
- **4-Filter:** This feature allows you to configure the criteria for delivering notifications. For instance, you can apply a filter based on a subscriber's online status to send them an email if they were online within the last hour. Read [more about filters](https://docs.novu.co/platform/step-filter/#subscriber-seen--read-filters).
- **5-Custom Code** - In custom code, you can write custom digest templates to show some/all parts of a message. Read [more about it here](https://docs.novu.co/platform/digest#writing-digest-templates).
- **6-Test** - This allows you to send a test email to test if everything is working as per your wish.

You can write your own digest template in the 'custom code' section or just follow this guide as shown in the picture above.
Once you’re done configuring this to your liking, click on the ‘update’ button on the top right.

It’ll automatically create a trigger code that you can use in your app. To get it, click on the ‘get snippet’ button on the top right and copy it:

![code snippet to trigger ](https://res.cloudinary.com/dxc6bnman/image/upload/v1689096592/guides/Screenshot_2023-07-11_at_10.59.42_PM_pmd1as.png)

Now, let’s see how to add Novu to our app!

## Add Novu to the Backend and Configure it

In your backend, install the novu package using the following code:

```bash
npm install @novu/node
```

Now, create a route that you want to hit when called from the front end. In our demo app, this is the route:

```jsx
import express from 'express';

import { getEmailDigest } from '../controller/emaildigest.js';

const router = express.Router();

router.post('/sending-email-digest', getEmailDigest);

export default router;
```

Now, we need to write a controller function that will handle the logic for what is to be sent in the trigger function’s payload. In our case, this is the controller function:

```jsx
import { sendEmailDigest } from '../novu/novu.js';

export const getEmailDigest = async (req, res) => {
  const { notif, email } = req.body;
  try {
    await sendEmailDigest(notif, email);
    res.status(201).json({ message: 'success', notif: notif });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
```

To make it modular, we’ll keep the trigger code in a separate function in a separate file (’novu.js’, in our case) and the trigger function is getting called in the controller function above by the name ‘getEmailDigest’.

If you’re following the guide, you’ve already copied the trigger function. But before we can add it to our app, we need one key thing - Subscribers.

Subscribers are users to which the notifications are sent. You can see a list of subscribers in the [Novu dashboard](https://web.novu.co/subscribers) as well.

In our app, we’ll create a subscriber in Node.js as we’re writing our backend in Node.js, but we also have backend SDKs ([Node.js](https://github.com/novuhq/novu/tree/next/packages/node), [PHP](https://github.com/novuhq/novu-php), [.NET](https://github.com/novuhq/novu-dotnet), [Elixir](https://github.com/novuhq/novu-elixir), [Go](https://github.com/novuhq/go-novu), [Ruby](https://github.com/novuhq/novu-ruby), [Python](https://github.com/novuhq/novu-python), and [Kotlin](https://github.com/novuhq/novu-kotlin)) to choose from. The recommended way to create a subscriber in NodeJS is as follows:

```jsx
await novu.subscribers.identify('digestEmailSub', {
  firstName: 'digest email subscriber',
  email: email,
});
```

Here, we’re creating a subscriber with the `subscriberID` of `digestEmailSub.` In most real-world scenarios, the `subscriberId` should be an alphanumeric entity like `adfa67y87ad0`. You can read more about subscribers [here](https://docs.novu.co/platform/subscribers/).

Back in our app, we can now add the trigger function:

```jsx
import { Novu } from '@novu/node';

export const sendEmailDigest = async (notif, email) => {
  const novu = new Novu(process.env.YOUR_NOVU_API_KEY);
  await novu.subscribers.identify('digestEmailSub', {
    firstName: 'digest email subscriber',
    email: email,
  });

  novu.trigger('emaildigestworkflow', {
    to: {
      subscriberId: 'digestEmailSub',
      email: email,
    },
    payload: {
      notif: notif,
    },
  });
};
```

Now, we just need to hit the route defined above from the front end.

## Hit the backend route from the front end

From the front end, we just need to hit the route we had defined above. Below, I'm sharing the body component of the demo app I created to illustrate this:

```jsx
const Body = () => {
  const [formInput, setFormInput] = useState({ notif: '', email: '' });
  const [buttonClicked, setButtonClicked] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    const response = await fetch(
      'https://emaildigestbackend.onrender.com/api/v1/sending-email-digest',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formInput),
      }
    );
    console.log(response.data);
    setFormInput({ notif: '' });
  };

  const handleClick = () => {
    setButtonClicked(true);

    // Reset the button feedback after a certain duration
    setTimeout(() => {
      setButtonClicked(false);
    }, 100);
  };

  const onChangeHandler = (e) => {
    const value = e.target.name === 'email' ? e.target.value.trim() : e.target.value;

    setFormInput((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };
  return (
    <div>
      <h1>Email Digest Playground</h1>
      <p>
        Don't know how to? Start{' '}
        <a className="underline" href="https://docs.novu.co/platform/digest/">
          {' '}
          here
        </a>
      </p>
      <form onSubmit={onSubmitHandler}>
        <div>
          <div>
            <label htmlFor="email" className="w-48">
              Email:
            </label>
            <input
              placeholder="Your Email here"
              value={formInput.email}
              id="email"
              name="email"
              onChange={onChangeHandler}
            />
          </div>
          <div>
            <label htmlFor="notif">Notification:</label>
            <textarea
              placeholder="Enter the notification text"
              value={formInput.notif}
              id="notif"
              name="notif"
              onChange={onChangeHandler}
            />
          </div>
        </div>

        <button onClick={handleClick} type="submit">
          <BiRightArrowAlt className="text-2xl" />
        </button>
      </form>
    </div>
  );
};
```

We're hitting the backend route we had created earlier. The backend has been deployed on render as can be seen in this code snippet above.

Congratulations on following the guide up until this point. We can style our app a little using [some TailwindCSS](https://github.com/novuhq/digest-email-app/blob/main/frontend/src/app.css).

If you’ve done everything as recommended, you’ll end up with an app that looks like this:

![email digest app showcase](https://res.cloudinary.com/dxc6bnman/image/upload/v1689188594/guides/output_lkcrll.gif)

In this app, when we enter the email id, some text in the input box, and click send, the notification appears in the inbox after the delay specified above (when we’re creating the workflow).
