# Novu Ryver Provider

A Ryver chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

````javascript
import { RyverProvider } from '@novu/ryver';

const provider = new RyverProvider({
  username: process.env.username,
  password: process.env.password,
  clientId: process.env.clientId,
});
````
