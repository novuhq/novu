# Integrations Store

Novu's integrations page is used to configure the final delivery providers for each channel. Novu is an open-source project that allows you to submit a new provider entry whenever you miss a particular provider. You can read more about it here.

## Provider Channels

Each provider connects to a specific channel within the platform, currently we support the following channels:

- E-mail
- SMS
- In-app notification center

## Provider specific configuration

When visiting the integration store and connecting a provider you will be asked to provide more provider-specific configurations such as API Keys and other credentials.

### Email configurations

For email providers, you will be required to add the following data:

- **Sender Email Address** - Will be used to send an email from address, usually you would have to white-label this address or domain with your email provider.
- **Sender From Name** - The name that will be displayed as the sender identity for the email.

## Missing a provider?

Novu is an open-source platform, meaning that if you are missing a particular provider you can create one using the guide specified [here](/community/create-provider).
