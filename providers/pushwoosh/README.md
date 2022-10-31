## Usage

-- First, you must create the files that are necessary to display push notifications. When creating the files; manifest.json and pushwoosh-service-worker.js must be at the top level root. Then, copy the returned string and paste it into the head element of the index.html file

-- The main point of this service is monitoring received push notifications, creating a function as part of the very large config. There is a very small setup process involving code, it's mainly just including the integrated files at the root of the project, though most of the configuration can be done in the constructor.

```ts
import { Novu } from '@novu/node';
const novu = new Novu(process.env.NOVU_API_KEY);
novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    deviceTokens: ['abcda...'], // Override subscriberId notification/device identifiers
    badge: 1, // iOS: The value of the badge on the home screen app icon, if 0 then the badge is removed.
    clickAction: 'clickity', // Android: Action associated with a user click on the notification.
    color: '#ff00ff', // Android: Hex color of the notification
    icon: 'myicon', // Android: Drawable resource id of icon, Web: URL to icon
    sound: 'custom_sound', // Android: name of custom notification sound
  },
});
```
