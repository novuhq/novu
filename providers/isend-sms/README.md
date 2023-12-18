# Novu iSend SMS Provider

iSend sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { ISendSmsProvider } from '@novu/isend-sms';

const provider = new ISendSmsProvider({
  // (Required) Get an API token from https://send.com.ly/
  apiToken: process.env.ISENDSMS_API_TOKEN,

  // (Optional) The sender id provided by iSend
  from: process.env.ISENDSMS_SENDER_ID,

  // (Optional) Either 'unicode' or 'plain'
  contentType: process.env.ISENDSMS_MSG_TYPE,
});
```
