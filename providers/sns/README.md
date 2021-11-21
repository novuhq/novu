# Notifire Sns Provider

A SNS SMS provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { SNSSmsProvider } from "@notifire/sns"

const provider = new SNSSmsProvider({
    region: "eu-west-1",
    accessKeyId: "AWS_ACCESS_KEY_ID",
    secretAccessKey: "AWS_SECRET_ACCESS_KEY",
});
```
