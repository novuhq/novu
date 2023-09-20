# SMS

Novu can be used to send SMS to your customers using a unified delivery API. You can easily integrate your favorite delivery provider using the built-in integration store.

## Sending SMS Overrides

The overrides field supports an sms property with provider name that should have the interface of this:

```ts
import { Novu } from './src/index';

const novu = new Novu('<NOVU_API_KEY>');

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
    phone: '+11234567890',
  },
  payload: {},
  overrides: {
    sms: {
      from: '+112344444', //sender's phone
      to: '+10987654321', //sms will be sent to this number
      content: 'overriden message content', //this is the message to be sent
    },
    twilio: {
      //provider id can be sent instead of "sms" key as well
      from: '+112344444', //sender's phone
      to: '+10987654321', //sms will be sent to this number
      content: 'overriden message content', //this is the message to be sent
    },
  },
});
```

To read a provider specific documentation:

- [Twilio](/channels/sms/twilio)
- [SMS77](/channels/sms/SMS77)
- [Africa's Talking](/channels/sms/africas-talking)
- [Infobip](/channels/sms/infobip)
- [Nexmo](/channels/sms/nexmo)
- [Plivo](/channels/sms/plivo)
- [Sendchamp](/channels/sms/sendchamp)
- [AWS SNS](/channels/sms/sns)
- [Telnyx](/channels/sms/telnyx)
- [Termii](/channels/sms/termii)
