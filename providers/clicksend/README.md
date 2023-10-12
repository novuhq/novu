# Novu Clicksend Provider

A Clicksend sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
    import { ClicksendSmsProvider } from '@novu/clicksend'

    const provider = new ClicksendSmsProvider({
        username: process.env.CLICKSEND_USERNAME,
        apiKey: process.env.CLICKSEND_API_KEY,
        })
    ```
