# Novu Sns Provider

A SNS SMS provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { SNSSmsProvider } from "@novu/sns"

const provider = new SNSSmsProvider({
    region: "eu-west-1",
    accessKeyId: "AWS_ACCESS_KEY_ID",
    secretAccessKey: "AWS_SECRET_ACCESS_KEY",
});
```
