# Notifire Sparkpost Provider

A Sparkpost email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
    import { SparkpostEmailProvider } from "@notifire/sparkpost";
    const provider = new SparkpostEmailProvider({
      apiKey: process.env.SPARKPOST_APIKEY,
      apiSecret: process.env.SPARKPOST_API_SECRET,
      from: process.env.SPARKPOST_FROM_EMAIL,
    });
```
