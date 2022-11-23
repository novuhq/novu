## Usage

-- First, you must create the files that are necessary to display push notifications. When creating the files; manifest.json and pushwoosh-service-worker.js must be at the top level root. Then, copy the returned string and paste it into the head element of the index.html file

-- The main point of this service is monitoring received push notifications, creating a function as part of the very large config. There is a very small setup process involving code, it's mainly just including the integrated files at the root of the project, though most of the configuration can be done in the constructor.

```ts
import { PushwooshPushProvider } from '@novu/pushwoosh';

const provider = new PushwooshPushProvider({
      applicationCode: process.env.PUSHWOOSH_APP_CODE;
      defaultNotificationTitle: "title"; //optional
      autoSubscribe: false; //optional
      triggeredFunction: triggerFunc(); //optional
      userId?: "My-ID"; //optional
      tags?: {
        'Optional Tag' : 'Optional Field'
      }; //optional
      defaultNotificationImageURL?: "www.randomURL.com"; //optional
})

```
