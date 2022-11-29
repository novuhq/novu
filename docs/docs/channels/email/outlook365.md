# Outlook365 ( based in custom SMTP server)

You can use the [Outlook 365](https://office.com) provider to send transactional emails through your instance of Office 365 to your customers using the Novu Platform with a single API.

## Getting Started

To use the Outlook 365 channel, you will need to have the sender's email (user) and the password for the account. This account cannot be a shared mailbox or distribution list. It will need to be properly licensed to send email via Office 365.

## Create the Outlook 365 integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Outlook 365 and click on the **Connect** button.
- Enter your SMTP credentials
  - `from`: Complete email address of the sending user. (e.g. jdoe@mycompany.com)
  - `senderName`: Sender Name should be the same email address of the sending user. (e.g. jdoe@mycompany.com)
  - `password`: Password used to sign in with the email account.
- You should now be able to send notifications using Nodemailer in Novu.
