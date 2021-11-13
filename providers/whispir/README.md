# Notifire Whispir Provider

A Whispir email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { WhispirSmsProvider } from './whispir.provider';

const provider = new WhispirSmsProvider({
    username: process.env.WHISPIR_USERNAME,
    password: process.env.WHISPIR_PASSWORD,
    apiKey: process.env.WHISPIR_API_KEY
});
```
