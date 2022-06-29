
<div align="center">
  
  ![Logo Dark](https://user-images.githubusercontent.com/8872447/165779319-34962ccc-3149-466c-b1da-97fd93254520.png#gh-dark-mode-only)

  
</div>

<div align="center">
  
  ![Logo Light](https://user-images.githubusercontent.com/8872447/165779274-22a190da-3284-487e-bd1e-14983df12cbb.png#gh-light-mode-only)
  
</div>


<h2 align="center">The Open-Source Notification Infrastructure</h2>

<div align="center">
Ultimate service for managing multi-channel notifications with a single API. 
</div>

***

  <p align="center">
    <a href="https://docs.novu.co" rel="dofollow"><strong>Explore the docs »</strong></a>
    <br />

  <br/>
    <a href="https://github.com/novuhq/novu/issues">Report Bug</a>
    ·
    <a href="https://github.com/novuhq/novu/discussions">Request Feature</a>
    ·
  <a href="https://discord.gg/TT6TttXjRe">Join Our Discord</a>
    ·
    <a href="https://github.com/orgs/novuhq/projects/2">Roadmap</a>
    ·
    <a href="https://twitter.com/novuhq">Twitter</a>
  </p>
  
  ***

<div align="center">
  <p>
  Building a notification system is hard, at first, it seems like just sending an email but in reality,<br />
  it's just the beginning. In today's world users expect a multi-channel communication <br />
experience over email, SMS, push, direct, and more... 

An ever-growing list of providers is popping up each day, and notifications are spread around the code. 

<strong>Novu's goal is to simplify notifications and provide developers with the tools to create meaningful communication.</strong>
  </p>
  </div>

  ***

## ✨ Features

- 🌈 Single API for all messaging providers (Email, SMS, Push, Direct)
- 💅 Easily manage notification over multiple channels
- 🚀 Equipped with a CMS for advanced layouts and design management
- 🛡 Built-in protection for missing variables (Coming Soon)
- 📦 Easy to set up and integrate
- 📦 Embeddable notification center with real-time updates
- 🛡 Debug and analyze multi channel messages in a single dashboard
- 👨‍💻 Community driven

***

## 🚀 Getting Started
<br />
<details>
  <summary><strong>Self-hosted version </strong></summary>

```markdown
💡 Before you begin, make sure you have all the below installed:
```

- [Node.js v14 or above](https://nodejs.org/en/download/)
- [npm v7 or above](https://github.blog/2020-10-13-presenting-v7-0-0-of-the-npm-cli/)
- [Docker](https://docs.docker.com/desktop/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git/)
- [MongoDB](https://www.mongodb.com/docs/)
- [PNPM](https://pnpm.io/)
- [Redis](https://redis.io/docs/)

## Project Setup
1. On your home `~/` directory create a `projects` folder.
    
    This will help you to organize all of your code in an accessible place in the terminal.
    
2. On GitHub desktop (or using git CLI) clone the project `novuhq/novu` into the newly created `projects` folder.
    
    As result, you will have the following directory structure:  `~/projects/novu/{CODE}`
    
3. For VSCode - click Open Workspace, as it would automatically organize folders in the best way:

<div align="center">

![something](https://user-images.githubusercontent.com/63902456/176311038-3276a028-3ec9-4e44-8323-5a701681437d.png)

</div>

CD into the following: `~/projects/novu/`  and run the setup command: 
> This won’t work if you don’t run the container before

```bash
npm run setup:project
```

```markdown

💡 The command will run pnpm install and install all the dependencies for the services and generate local .env files.

```

## Running the project

There are 2 ways for you to run the project:

### 1. Global PNPM start **(Fastest)**

Run with - you will run all the projects on one terminal. As result, you won't be able to update or debug a specific service in isolation. 

### 2. Scoped service run

Select one service and run it under its directory with `pnpm start`. 
A good way for updating and testing specific services.

</details>
<br />
<details>
  <summary><strong>Stateless</strong></summary>
  
</details>
<br />
<details>
  <summary><strong>Hosted version</strong></summary>
  
 ```bash 
npx novu init
```

After setting up your account using the cloud or docker version you can trigger the API using the `@novu/node` package.

 ```bash 
npm install @novu/node
```

```typescript

import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.trigger('<TRIGGER_NAME>',
  {
    to: {
      subscriberId: '<UNIQUE_IDENTIFIER>',
      email: 'john@doemail.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    payload: {
      name: "Hello World",
      organization: {
        logo: 'https://happycorp.com/logo.png',
      },
    },
  }
);

```
</details>
<br />

***


## Embeddable notification center

Using the Novu API and admin panel you can easily add real-time notification center to your web-app without the hassle of building it yourself. You can use our React component or an iframe embed if you are not using React.

<div align="center">
<img width="762" alt="notification-center-912bb96e009fb3a69bafec23bcde00b0" src="https://github.com/iampearceman/Design-assets/blob/main/Untitled%20design%20(8).gif?raw=true">
  
  Read more about how to add a notification center to your app with the Novu API [here](https://docs.novu.co/docs/notification-center/getting-started)

</div>


## Providers
Novu provides a single API to manage providers across multiple channels with a simple to use interface.

#### 💌 Email
- [x] [Sendgrid](https://github.com/novuhq/novu/tree/main/providers/sendgrid)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/main/providers/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/main/providers/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/main/providers/postmark)
- [x] [NodeMailer](https://github.com/novuhq/novu/tree/main/providers/nodemailer)
- [x] [Mailjet](https://github.com/novuhq/novu/tree/main/providers/mailjet)
- [x] [Mandrill](https://github.com/novuhq/novu/tree/main/providers/mandrill)
- [x] [SendinBlue](https://github.com/novuhq/novu/tree/main/providers/sendinblue)
- [x] [EmailJS](https://github.com/novuhq/novu/tree/main/providers/emailjs)
- [ ] SparkPost

#### 📞 SMS
- [x] [Twilio](https://github.com/novuhq/novu/tree/main/providers/twilio)
- [x] [Plivo](https://github.com/novuhq/novu/tree/main/providers/plivo)
- [x] [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)
- [x] [Nexmo - Vonage](https://github.com/novuhq/novu/tree/main/providers/nexmo)
- [x] [Sms77](https://github.com/novuhq/novu/tree/main/providers/sms77)
- [x] [Telnyx](https://github.com/novuhq/novu/tree/main/providers/telnyx)
- [x] [Termii](https://github.com/novuhq/novu/tree/main/providers/termii)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push (Coming Soon...)
- [ ] Pushwoosh
- [ ] SNS

#### 👇 Direct (Coming Soon...)
- [ ] Slack
- [ ] MS Teams
- [ ] Discord
- [ ] Mattermost

#### 📱 In-App
- [x] [Novu](https://docs.novu.co/docs/notification-center/getting-started)
- [ ] MagicBell 

#### Other (Coming Soon...)
- [ ] PagerDuty

## 💻  Need Help?

We are more than happy to help you. Don't worry if you are getting some errors or problems while working with the project. Or just want to discuss something related to the project.

Just <a href="https://discord.gg/TT6TttXjRe">Join Our Discord</a> server and ask for help.

## 🔗 Links
- [Home page](https://novu.co/)
