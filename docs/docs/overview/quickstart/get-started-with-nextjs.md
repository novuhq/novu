---
sidebar_position: 6
sidebar_label: NextJS
---

# NextJS Quickstart

This quick start guide is written to help you integrate Novu into your NextJS app in no time. Novu is an open-source notifications infrastructure that you can use in your app to deliver rich notifications across channels like sms, email, in-app, push, chat, etc. In this guide, you’ll learn how to integrate email notifications into your NextJS app.

You can find the code for this app [here](https://github.com/novuhq/nextjs-quickstart/)

## Prerequisites

- Node.js installed on your development machine (to create a NextJS app).
- A Novu account. If you don't have one, sign up for free [here](https://web.novu.co/workflows).

## Create a NextJS app to get started

The first step here would be to create a NextJS app. We will play with Novu in this app later. To get started, open your terminal and create a NextJS app using the following command:

```bash
npx create-next-app@latest
```

This will create a NextJS app and now we can add Novu to our project. Open the app using a code editor of your choice. The benefit of using NextJS is that it provides native support for routing, making it effortless to handle navigation and create dynamic pages in your application.

Next.js uses a file-based routing system, where each page in your application is represented by a corresponding file in the `pages` directory.

By creating a new file in the `pages` directory, such as `about.js`, we automatically create a route `/about` in our application. Next.js handles the routing logic behind the scenes, ensuring that when a user accesses `/about`, the corresponding page component is rendered.

In our app, we’ll create a route that will send an email notification to a specified email id. To do this, we need two things:

- Install Novu and connect it to our app
- Create the route and define a function in that route

## Installing Novu and connecting it to the app

To install Novu, simply open your terminal and issue the following command:

```bash
npm install @novu/node
```

After installing it, we need to connect our app with our Novu account using the Novu API key. Simply log onto the [Novu web dashboard](https://web.novu.co) and from the settings there, obtain your API key. We’ll use it to connect our app to our Novu account.

![Novu API key is available on the Novu web dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127601/guides/SCR-20230630-ppsb_ky06jv.png)

Now, we need to connect it to our app. To do so, the first step is to import Novu into our app. Importing Novu will give us the ability to interact with the Novu API. To import Novu into our app, use the following code in a separate file in our app:

```jsx
import { Novu } from '@novu/node';

// replace <NOVU_API_KEY> with your actual API key
const novu = new Novu(<YOUR_NOVU_API_KEY>);
```

Novu lets us send notifications across different channels like email, in-app, chat, SMS, etc, and for each channel, one can use a plethora of providers. You just need to set up a provider for the channel you want to use in Novu:

| Channel | Providers                                                           |
| ------- | ------------------------------------------------------------------- | --- |
| Email   | MailGun, Mandrill, MailJet, Amazon SES, Sendgrid, Postmark, Netcore |     |
| SMS     | Twilio, Amazon SNS, Plivo, SMS, SMSCentral, Kannel, Infobip, Termii |
| Chat    | Mattermost, Slack, Microsoft Teams, Discord                         |
| Push    | FCM, APNS, Expo                                                     |

You can see all this in our [integrations store](https://web.novu.co/integrations) and set it up there.

For each channel, there can be only one provider active at a time. Although the exact setup process varies from provider to provider, the general flow is signing up for a provider, getting an API key from its portal, and plugging it into the Novu web portal.

Once having integrated a provider, we need a notification workflow to send notifications. One can have dynamic data in this workflow if they so choose.

In our case, we’ll have dynamic data and whatever we send as a description will be sent as an email notification. Following are the steps to create a notification workflow.

## Creating a notification workflow

1. Click "Workflows” on the left sidebar of your Novu dashboard.
2. Click the “Create Workflow” button on the top right.
   ![Creating a workflow in Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127676/guides/SCR-20230630-pqdm_z5npqe.png)
3. The name of a new notification workflow is currently "Untitled." Rename it to a more suitable title.
   ![Renaming the newly created notification workflow](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127735/guides/SCR-20230630-pqpp_lvjfea.png)
4. Select "Email" as the channel you want to add, by dragging it from the right sidebar:
   ![Adding email channel to the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128047/guides/SCR-20230630-psgt_ottznp.png)
5. Click on the ‘Email’ in the workflow and edit it as per this image. Don’t forget to add the fields in the editor which is supposed to be updated with dynamic values that we’ll send when calling the API.
   ![Adding email and description to the editor in the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128150/guides/SCR-20230630-psxv_ef7jwh.png)
6. Also, add the variables in the ‘variables’ section in the test tab and try testing it by sending the email to your email id using the ‘send test email’ button on the bottom right.
   ![Adding variables to the 'variables' section](https://res.cloudinary.com/dxc6bnman/image/upload/v1688129220/guides/SCR-20230630-pzgl_n94giv.png)

Now, we’ve successfully sent the test email and just need to do this from our app.

## Subscribers

In Novu, entities that are supposed to receive notifications are called subscribers. You can see all the subscribers in the ‘subscribers’ tab in the left menu on the Novu web portal. There would be one subscriber by default, which is you. This was created when you signed up for Novu.

In real-world scenarios, the `subscriber id` would be a unique id generated automatically by the database. So for our demo purpose, we’re using a simple subscriber id of ‘1234567890’ in our app.

We’ll first create a subscriber using the following code:

```jsx
import { Novu } from '@novu/node';

const novu = new Novu(<YOUR_NOVU_API_KEY>);

export async function sendEmail(email, description) {
    await novu.subscribers.identify('1234567890', {
        email: email,
        firstName: "Subscriber",
    });
}
```

Here, we’re creating a subscriber with the subscriber id of `1234567890` and now we’ll send a notification to the subscriber with this very subscriber id by triggering an email notification like follows:

```jsx
import { Novu } from '@novu/node';

const novu = new Novu(<YOUR_NOVU_API_KEY>);

export async function sendEmail(email, description) {
    await novu.subscribers.identify('1234567890', {
        email: email,
        firstName: "Subscriber",
    });
    await novu.trigger('email-quickstart', {
        to: {
            subscriberId: '1234567890',
            email: email
        },
        payload: {
            email: email,
            description: description
        }
    });
}
```

We’ve exported this function so that we can use this in the route that we’ll now create.

## Create the route and define a function in that route

Now, create a `pages` directory in the root of the project and create a file in it. Give it a name and remember that it will automatically become a route.

In our case, we’re creating a directory called `api` in our pages directory, and inside `api` we’re creating a file called `sub.js`. In this case, our path will be: `http://localhost:3000/api/sub`

In this file, we simply need to define a function that will handle a POST request to our API. It’ll extract the ‘description’ and ‘email’ variables from the ‘request’ body that will be generated every time we make a POST request and call the function to send an email notification with those plugged in.

We’d used these variables in the notification workflow we had created in the Novu dashboard and also specified the same in the trigger function above.

The function in our route is quite simple and looks like this:

```jsx
import { sendEmail } from '@/app/utils/novu';

export default async function subscribe(req, res) {
  try {
    if (req.method === 'POST') {
      const { email, description } = req.body;
      await sendEmail(email, description);
      await res.status(200).json({ message: 'email working' });
    }
  } catch (error) {
    console.log(error);
    res.status(405).json({ message: 'not working' });
  }
}
```

We can now start our local server and test our backend app on Postman. To start the local server, use the following command:

```bash
npm run dev
```

Now, open Postman and send a POST request to the route you created earlier. The exact route depends on the file structure you have followed in the pages directory, but in our case, it is - `http://localhost:3000/api/sub`

Also, make sure that in the body, you’re passing the two variables we’re extracting above, namely - email and description, as follows:
![passing the variables email and description in the body in Postman](https://res.cloudinary.com/dxc6bnman/image/upload/v1686777937/guides/Screenshot_2023-05-23_at_3.17.12_AM_s8itiv.png)

> In place of <youremail@gmail.com>, use your actual email and once you send it, you should see the ‘message: email working’ on the bottom as in the image above.

This means that the email notification was sent successfully. Now go to your inbox and you should see an email notification like the following:

![email received successfully in the inbox](https://res.cloudinary.com/dxc6bnman/image/upload/v1686778047/guides/Image_23-05-23_at_3.19_AM_1_heqalp.jpg)

## Topics

Novu simplifies the process of triggering notifications to multiple subscribers with an API called "Topics". By utilizing the Topics API, you can effortlessly manage bulk notifications easily.

Each topic is uniquely identified by a custom key specified by the user, serving as the primary identifier for interacting with the Topics API.

This intuitive approach streamlines notifications management, empowering users to focus on delivering targeted messages to their subscribers without the hassle of intricate implementation details.

> Make sure that you use a unique key for a Topic. Keys once used, can’t be changed later!

You have the flexibility to assign a descriptive name to a topic. Unlike the topic key, this name does not require uniqueness and can be modified using the provided API.

A topic can have multiple subscribers associated with it. These subscribers will receive notifications whenever a notification is dispatched to the respective topic.

### Create a topic

You can create a topic using two entities - `key` and `name`. Keys are unique identifiers for topics and a name is just something you assign to a topic for convenience.

```jsx
import { Novu } from '@novu/node';

export default async function createTopic(req, res) {
  try {
    const novu = new Novu(process.env.NOVU_API_KEY);
    if (req.method === 'POST') {
      const { key, name } = req.body;
      const result = await novu.topics.create({ key, name });
      res.status(201).json(result.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
}
```

This is a simple function that calls the **`create`** method on the **`topics`** property of the **`novu`** instance. This method creates a new topic in the Novu system using the provided **`key`** and **`name`** values.

If you test this on your local machine, you should get something like this:

![testing create method](https://res.cloudinary.com/dxc6bnman/image/upload/v1689372862/guides/create_topic_u6gjzw.png)

> Note how the return object contains the key I sent from my request body. That signals successful creation!

## Add subscriber to a Topic

The code for adding a subscriber to a previously created topic is as follows:

:::info
Note: You can only add those subscribers to a topic that you've already created. You can see all the subscribers in the [Novu web dashboard](https://web.novu.co/subscribers)
:::

```jsx
import { Novu } from '@novu/node';

export default async function addSub(req, res) {
  try {
    const novu = new Novu(process.env.NOVU_API_KEY);
    if (req.method === 'POST') {
      // Get the subscriber ID from the request body
      const subscriberId = req.body.subscriberId;
      // Get the topic key from the request body
      const topicKey = req.body.topicKey;
      // Call Novu SDK to add the subscriber to the topic
      const result = await novu.topics.addSubscribers(topicKey, {
        subscribers: [subscriberId],
      });
      // Return the result as JSON response
      res.status(200).json(result.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
}
```

If you see the code above closely, you’ll see that we first establish a connection to Novu using the Novu API key. <br/><br/>Then we extract `subscriberID` and topicKey from the request body and call the **`addSubscribers`** method on the **`topics`** property of the **`novu`** instance, passing the topic key and an object with an array of subscribers. <br/><br/>This adds the subscriber with the `subscriberID` we’d passed to the array of subscribers, which in the above case contains just one subscriber. <br/><br/>If you check this on Postman, the returned array will contain the `subscriberID` that we had passed in the request body, signalling that it was added to the topic successfully. <br/><br/>If, on the other hand, you find the passed `subscriberId` in the `notFound` array inside the `failed` object, it means the subscriber wasn't added to the topic. <br/><br/>You can read more about it [here](https://docs.novu.co/platform/topics/#subscribers-management-in-a-topic).

The image below shows the case where the subscriber has been added successfully:

![The returned array contains 'subscriberID'](https://res.cloudinary.com/dxc6bnman/image/upload/v1689373330/guides/add_sub_upnde2.png)

After creating a topic and adding subscribers to the topic, we’ll now proceed to send a notification to all subscribers (we only have one subscriber in our topic though) of a topic. This is what Topics are used for - sending bulk notifications.

## Sending notifications to a topic

Sending notifications to a topic is not a complex task. You need to extract the topic key to which you want to send notifications and trigger Novu’s method on that topic key with the message in the payload:

```jsx
import { Novu } from '@novu/node';

export default async function sendNotifToSub(req, res) {
  try {
    const novu = new Novu(process.env.NOVU_API_KEY);
    if (req.method === 'POST') {
      // Get the topic key from the request body
      const topicKey = req.body.topicKey;
      const email = req.body.email;
      const description = req.body.description;

      // Call Novu SDK to trigger a notification to the topic subscribers
      const result = await novu.trigger('email-quickstart', {
        to: [{ type: 'Topic', topicKey: topicKey }],
        payload: {
          email: email,
          description: description,
        },
      });
      // Return the result as JSON response
      res.json(result.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
}
```

Testing this on Postman should give you something like this:

![Sending notifications to a topic](https://res.cloudinary.com/dxc6bnman/image/upload/v1689374058/guides/Screenshot_2023-07-15_at_4.04.10_AM_cjhpn2.png)

If you see this, then it means the notification was sent successfully, as can be seen in my inbox down below:

![Inbox has received the sent notification](https://res.cloudinary.com/dxc6bnman/image/upload/v1689373989/guides/Screenshot_2023-07-15_at_4.02.40_AM_gxhkmm.png)

## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, and notification workflow, configured a channel provider, triggered a single notification, and sent an email notification.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
