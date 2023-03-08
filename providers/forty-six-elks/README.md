# Novu FortySixElks Provider

A 46Elks sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { FortySixElksSmsProvider } from '@novu/fort-six-elks';

const provider = new FortySixElksSmsProvider({ 
  user: process.env.FORTY_SIX_ELKS_USERNAME,        // Your Elk46 Username
  password: process.env.FORTY_SIX_ELKS_PASSWORD,    // Your Elk46 Password
  from: process.env.FROM                            // The sender that you'd like the recipient to see, e.g 'Telco Inc.'
})

await provider.sendMessage({
  to: '+4677777777777',
  content: 'Med 46Elks skickar du sms ganska lätt!',
});
```
