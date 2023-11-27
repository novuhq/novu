# Novu Braze Provider

A Braze email provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { BrazeEmailProvider } from '@novu/braze';
const provider = new BrazeEmailProvider({
    apiKey: process.env.BRAZE_API_KEY,
    apiURL: process.env.BRAZE_API_URL,
    appID: process.env.BRAZE_API_ID,
})
```
