# Novu Africa's Talking Provider

An Africa's Talking SMS provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { AfricasTalkingSmsProvider } from '@novu/africas-talking';

 const provider = new AfricasTalkingSmsProvider({
    apiKey: process.env.AFRICAS_TALKING_API_KEY,
    username: process.env.AFRICAS_TALKING_USERNAME,
    from: process.env.AFRICAS_TALKING_FROM
  });
```
