# Telnyx

You can use the [Telnyx](https://telnyx.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Telnyx channel, you will need to create a Telnyx account and add your API key to the Telnyx integration on the Novu platform.

## Find the API Key

To find your Telnyx API key:

- Log into your Telnyx account.
- Navigate to Account Setting.
- Then go to [Keys & Credentials](https://portal.telnyx.com/#/app/api-keys).
- You can copy API key from there.
- Alternatively, you can create an API key by tapping on the Create API Key button.

Before copying it, make sure it's status is showing active.

## Find the Message profile ID

To get your Message profile ID:

- Navigate to [Messaging](https://portal.telnyx.com/#/app/messaging) to find the profiles.
- Make sure you created a Telnyx Messaging Profile previously. Learn more [here](https://developers.telnyx.com/docs/v2/messaging/quickstarts/portal-setup).
- Go to the active Messaging Profile.
- Copy the profile ID.

## Make sure From address is valid

A valid from address must be a valid phone number in +E.164 format, a short code, or an alphanumeric sender ID associated with the sending messaging profile. Alphanumeric sender IDs must be between 1 and 11 characters long, and can only contain ASCII letters, numbers, and spaces. They must contain at least one letter.

## Create a Telnyx integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on the Novu.
- Locate Telnyx and click on the **Connect** button.
- Enter your Telnyx API Key.
- Fill the Message profile ID field.
- Enter the Valid From address.
- Click on the **Save** button.
- You should now be able to send notifications using Telnyx in Novu.
