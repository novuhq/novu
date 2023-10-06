# Novu Ryver Provider

A Ryver chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

````javascript
import { RyverProvider } from '@novu/ryver';

const provider = new RyverProvider({
  apiKey: process.env.API_KEY,
  channelID: process.env.CHANNEL_ID,
});
````
