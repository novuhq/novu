---
sidebar_position: 4
sidebar_label: 'Add a new provider'
---

# How to add a new provider?

Novu currently supports five channels `in_app`, `push`, `email`, `chat` and `sms`. For `in_app` we support only our own provider, so new providers cannot be added for this channel. For the other four channels we support integration of external providers. This guide will help in adding new providers for any of these 4 channels. **In this guide, we are adding a new provider for email channel, but all of the mentioned steps are similar for other channels as well**.

## Description

Providers allow us to handle message delivery over multiple channels. We have multiple providers for each channel (SMS, Email, Push and Chat). To get started with adding a new provider let's look at setting up our repository.

## Requirements

- Node.js version v16.15.1
- MongoDB
- Redis
- **(Optional)** pnpm - Needed if you want to install new packages
- **(Optional)** localstack (required only in S3 related modules)

Need help installing the requirements? Read more [here](https://novuhq.notion.site/Dev-Machine-Setup-98d274c80fa249b0b0be75b9a7a72acb#a0e6bf0db22f46d8a2677692f986e366).

:::info
We have used pnpm package manager in this guide. You can use npm as well.
:::

## Initialization

Fork the novu repository and clone it in your local machine.

```shell
git clone https://github.com/<'YOUR_GITHUB_USER_NAME'>/novu.git
```

To set up the repository, run the initial setup command:

```shell
pnpm run setup:project
```

At the root of the project build the `node` package to get started.

```shell
cd packages/node && pnpm run build
```

## Generate provider

After the project is initialized, a new provider can be generated using below command.

```shell
pnpm run generate:provider
```

:::note
Use above command in root of the project.
:::

Choose the provider type.

```shell
> generate:provider
> npx hygen provider new

? What type
❯ EMAIL
  SMS
  PUSH
  CHAT
```

Use `up` and `down` arrow to switch `channel` type and press `enter` to select.

For this example, we will be selecting `EMAIL` as our provider type. The name for our provider will be `example-provider`.

```shell
? Write the provider name `kebab-cased` (e.g. proton-mail, outlook365, yahoo-mail): example-provider
```

Make sure your selected name is not conflicting with our existing provider's name. Boilerplate files for this new `example-provider` is generated in your local machine project.

> In above example, we have given our provider name as `example-provider` for simplicity. If provider you want to add have name as `twilio`, don't use `twilio-provider` as name, instead use `twilio` only. If one provider supports multiple channels like `infobip` supports both `sms` and `email` channels, use `infobip-email` or `infobip-sms` to differentiate these providers.

Once our `example-provider` is generated we will need to begin working from within `/providers/example-provider` directory. Make sure to write the test for this new provider.

```ts title='providers/example-provider/src/lib/example-provider.provider.ts'
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';

export class ExampleProviderEmailProvider implements IEmailProvider {
  id = 'example-provider'
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {}

  async sendMessage(options: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    return {
      id: 'id_returned_by_provider',
      date: 'current_time'
  }
}
```

Template test case for `example-provider`.

```ts title='providers/example-provider/src/lib/example-provider.provider.sepc.ts'
import { ExampleProviderEmailProvider } from './example-provider.provider';

test('should trigger example-provider library correctly', async () => {});
```

:::info
Add provider's sdk as dependency in provider's package.json file. Run `pnpm run setup:project` to build all dependencies again. Use this newly sdk methods to complete provider's `sendMessage` function. Check [`Important Links`](#important-links) section for each channel's provider example.
:::

## Add provider logos

In order to present this new provider in the `integration store` we need logos in dark and light mode. Add dark and light color logs in respective folders of `apps/web/public/static/images/providers` directory. Use provider name as file name. Sample name for our above added provider is `example-provider.png`. The possible formats are `svg` and `png`.

## Add config items in the list

In order to build the UI integration store, we need to provide it list of all provider integrations.
This part is made up of two parts:

- Create credentials config
- Add ProviderId Enum
- Add provider configuration to providers list

### 1. Create credentials config

Every provider requires some credentials to create instance. Novu will add these credentials field in integration store provider's form so that user can use thier credentials to connect to their preferred provider to use for that channel notification.
For example, in above added `example-provider`, we have only one credential `ApiKey`. We will need to add
a config object for `example-provider` with all existing provider's configs like below.

```typescript title='libs/shared/src/consts/providers/credentials/provider-credentials.ts'
export const exampleProviderConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'text',
    required: true,
  },
  ...mailConfigBase,
];
```

1. Here `key` is of type `CredentialsKeyEnum`. If you want to add a new type of credentials key, you can add in `CredentialsKeyEnum`.
2. `displayName` is human-friendly easy to understand name which will be shown in provider integration form for this credential.
3. `type` here means text field type. this can be string for text, text for text-area, switch for toggle.
4. `required` is of boolean type.
5. `mailConfigBase` is an object having default credentials required by any `email` provider. Make sure not to add duplicate provider which are already there in `mailConfigBase`. In case of other channel provider, we will use that channel config base in place of `mailConfigBase`.

> A credential can be made secret by adding in `./secure-credentials.ts` file.

### 2. Add ProviderId Enum

Add this new provider id in respective channel provider id enum in file `libs/shared/src/consts/providers/provider.enum.ts`. As our `example-provider` is of email type, add this in `EmailProviderIdEnum` with all existing providers like below

```typescript title='libs/shared/src/consts/providers/provider.enum.ts'
export enum EmailProviderIdEnum {
  ExampleProvider = 'example-provider',
}
```

### 3. Add provider to providers list

Now we need to add the provider data to the list located at `libs/shared/src/consts/providers/channels/email.ts`.
Note that the `id` is the provider's name, `displayName` is the provider's name in pascal case, `credentials` are the one we created in the previous step, `logoFileName` should be as it was on the adding logo step (with the format type included).

```typescript title='libs/shared/src/consts/providers/channels/email.ts'
{
  id: 'example-provider',
  displayName: 'Example Provider',
  channel: ChannelTypeEnum.EMAIL,
  credentials: exampleProviderConfig,
  // Use valid documentation link
  docReference: 'https://docs.example-provider.com/',
  logoFileName: { light: 'example-provider.png', dark: 'example-provider.png' }
}
```

## Add provider handler in the API

### 1. Adding the provider dependency in application-generic package

In the previous step, we created a standalone provider package that will be published to NPM. However currently in our development environment, it is not yet published. In order to use it locally please go to the `package.json` located in `apps/packages/application-generic/package.json` and add it manually to the dependencies list: `"@novu/<NEW_PROVIDER_NAME>": "^<VERSION>"`

> Please note that the provider name and version can be found from the provider `package.json` you created earlier.

After adding the dependency run `pnpm run setup:project` from the root of the monorepo. so, it can create the required symlinks for the newly created package.

### 2. Create provider handler

In order to map internally the different providers credentials, we need to add a provider handler at respective channel handlers located. For Email it can be found at `apps/packages/application-generic/src/factories/mail/handlers`. Other channel handlers can also be found here.

Create a new file `example-provider.handler.ts` here with the following code

```typescript title='packages/application-generic/src/factories/mail/handlers/example-provider.handler.ts'
import { ChannelTypeEnum } from '@novu/shared';
import { ExampleProviderEmailProvider } from '@novu/example-provider';
import { BaseHandler } from './base.handler';

export class ExampleProviderHandler extends BaseHandler {
  constructor() {
    super('example-provider', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials, from: string) {
    const config: { apiKey: string } = { apiKey: credentials.apiKey };

    this.provider = new ExampleProviderEmailProvider(config);
  }
}
```

Add below line to export this handler

```typescript title='packages/application-generic/src/factories/mail/handlers/index.ts'
export * from './example-provider.handler';
```

### 3. Add handler to factory

The last step is to initialize the handler in the factory located in `packages/application-generic/src/factories/mail/mail.factory.ts`

```typescript title='packages/application-generic/src/factories/mail/mail.factory.ts'
import { ExampleProviderHandler } from './handlers';

export class MailFactory {
  handlers: IMailHandler[] = [new ExampleProviderHandler()];
}
```

## Final Steps

Now, build the project again using this command

```shell
pnpm run setup:project
```

Run novu in your local machine. Read [here](./run-locally.md) to learn on how to run novu in local machine and test this new provider.

Run below command in the root of project to run providers test

```shell
pnpm run test:providers
```

If everything is working fine without any error, commit your local branch changes, push this branch and create a new pull request to our main repo.

Hurray 🎉! You have successfully added a new provider in Novu!

:::info
In this guide, we have used only one credential `apiKey` for our `example-provider`. This is for reference purpose only. Provider can have more than one credential as per its `SDK` requirements. At each step, you will need to be add all credentials carefully. Check providers in below `Important Links` section for reference.
:::

## Important Links

- [SendGrid Email Provider](https://github.com/novuhq/novu/blob/next/providers/sendgrid/src/lib/sendgrid.provider.ts)
- [Twilio SMS Provider](https://github.com/novuhq/novu/blob/next/providers/twilio/src/lib/twilio.provider.ts)
- [FCM Push Provider](https://github.com/novuhq/novu/blob/next/providers/fcm/src/lib/fcm.provider.ts)
- [Slack Chat Provider](https://github.com/novuhq/novu/blob/next/providers/slack/src/lib/slack.provider.ts)
- [Resend - How to add an Email API Provider to Novu](https://dev.to/novu/resend-how-to-add-an-email-api-provider-to-novu-49cd)
