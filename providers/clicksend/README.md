# Novu Clicksend Provider

A Clicksend sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { ClicksendSmsProvider } from '@novu/clicksend'

const provider = new ClicksendSmsProvider({
    apiKey: process.env.CLICKSEND_API_KEY,
    username: process.env.CLICKSEND_USERNAME,
    from: process.env.CLICKSEND_FROM
```
