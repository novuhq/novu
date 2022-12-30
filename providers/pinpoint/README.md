# Novu Pinpoint Provider

A Pinpoint SMS provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { PinpointSMSProvider } from '@novu/pinpoint';

const provider = new PinpointSMSProvider({
  region: 'eu-central-1',
  accessKeyId: 'AWS_ACCESS_KEY_ID',
  secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
  from: '+1234567',
});
```
