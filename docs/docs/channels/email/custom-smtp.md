# Custom SMTP

You can use the [Custom SMTP](https://nodemailer.com/about/) provider to send transactional emails through your custom SMTP server to your customers using the Novu Platform with a single API.

## Getting Started

To use the Custom SMTP channel, you will need to have your personal SMTP server configured and add `host`, `port`, `user`, `password` to the Nodemailer integration on the Novu platform.

You can also provide value **`true`** for `secure` field if you want the connection to be secure, and if not, leave it empty.

### DKIM (DomainKeys Identified Mail)

DKIM options can be used in order to sign messages sent using Custom SMTP with DKIM keys.

Those options are:

- `DKIM Domain`
- `DKIM Private Key`
- `DKIM Key Selector`

## Create a Custom SMTP integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Custom SMTP and click on the **Connect** button.
- Enter your SMTP credentials
  - `host`
  - `port`
  - `username`
  - `password`
  - `secure` (on demand)
  - And `DKIM` options if you want to sign messages with _DKIM_
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the **Save** button.
- You should now be able to send notifications using Custom SMTP in Novu.
