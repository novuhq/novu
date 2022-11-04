# Novu MSGraph API Provider

A MSGraph API email provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { MSGraphAPIProvider } from '@novu/msgraph';

const provider = new MSGraphAPIProvider({
  authority: '<authority>/<tenant>',
  clientId: '<clientId>',
  fromAddress: 'test@novu.dev',
  fromName: 'novu',
  scopes: '',
  secret: '<secret>',
  user: '<microsoft-user>',
});
```
