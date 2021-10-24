# Notifire Mailjet Provider

A Mailjet email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
    import { MailjetEmailProvider } from "@notifire/mailjet";
    const provider = new MailjetEmailProvider({
      apiKey: process.env.MAILJET_APIKEY,
      apiSecret: process.env.MAILJET_API_SECRET,
      from: process.env.MAILJET_FROM_EMAIL,
    });
```
