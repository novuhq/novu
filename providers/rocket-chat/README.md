# Novu RocketChat Provider

A RocketChat chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { RocketChatProvider } from '@novu/rocket-chat';

const provider = new RocketChatProvider({
  user: process.env.ROCKET_CHAT_USER_ID,
  token: process.env.ROCKET_CHAT_TOKEN,
});
```
