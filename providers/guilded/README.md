# Novu Guilded Provider

A Guilded chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { GuildedChatProvider } from './guilded.provider';

const provider = new GuildedChatProvider({
  apiKey: process.env.API_KEY,
  channelID: process.env.CHANNEL_ID,
});
```
