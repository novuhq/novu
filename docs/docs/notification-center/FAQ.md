---
sidebar_position: 9
---

import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

# FAQs

<FAQ>
<FAQItem title="Notification center is not loading properly.">

Possible causes for the notification center not loading properly:

- Invalid subscriberId
- Invalid applicationIdentifier
- Invalid backendUrl (in case of self hosted)
- Invalid socketUrl (in case of self hosted)

</FAQItem>
<FAQItem title="There is a render error due to notification center in react.">

Notification center should be wrapped in **NovuProvider**.

</FAQItem>
<FAQItem title="What socket events are supported in useSocket hook?">

There are two events. **unread_count_changed** and **unseen_count_changed**.

</FAQItem>
<FAQItem title="What is the difference between redirect URL and CTA?">

Redirect URL is for entire notification, When user will click notification user will route to that url. CTA are two call to action buttons. **onNotificationClick** function props is used for redirect url and **onActionClick** function props is used for CTA. Read more about actions [here](./react/react-components#notification-actions).

</FAQItem>
<FAQItem title="How to create a new feed and add notification to that feed?">

Add an in-app step in a workflow. Click on the step to edit. A new workflow editor page will appear. Scroll down. There you will find an option **Add New Feed**. You can either create new feed or add this template to existing feeds.

</FAQItem>
<FAQItem title="How to customize notification center?">

Everything can be customized in Novu. **useNotification** hook in react component provides few functions to customize. **Header**, **Footer**, **Bell** etc can also be customized. Read more about customization [here](./react/react-components#custom-ui)

</FAQItem>
<FAQItem title="Notification bell is not showing in iframe">

We use font awesome bell icon. Make sure you have added font awesome css cdn link in head tag.

```html
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
  integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
/>
```

</FAQItem>
</FAQ>
