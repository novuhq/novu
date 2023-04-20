# Novu Africastalking Provider

A Africastalking sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { AfricastalkingSmsProvider } from '@novu/africastalking';

 const provider = new AfricastalkingSmsProvider({
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME,
    from: process.env.AFRICASTALKING_FROM
  });
```
