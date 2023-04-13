---
sidebar_position: 9
---

# FAQs

<details>
 <summary> Notification center is not loading properly.</summary>

Possible causes for the notification center not loading properly:

- Invalid subscriberId
- Invalid applicationIdentifier
- Invalid backendUrl (in case of self hosted)
- Invalid socketUrl (in case of self hosted)

</details>

<details>
 <summary>There is a render error due to notification center in react.</summary>

Notification center should be wrapped in <b>NovuProvider</b>.

</details>

<details>
 <summary>What socket events are supported in <b>useSocket</b> hook?</summary>

There are two events. <b>unread_count_changed</b> and <b>unseen_count_changed</b>.

</details>

<details>
 <summary>What is the difference between redirect URL and CTA?</summary>

Redirect URL is for entire notification, When user will click notification user will route to that url. CTA are two call to action buttons. <b>onNotificationClick</b> function props is used for redirect url and <b>onActionClick</b> function props is used for CTA. Read more about actions [here](./react/react-components#notification-actions).

</details>

<details>
 <summary>How to create a new feed and add notification to that feed?</summary>

Add a in-app step in template workflow. Click on this step and then click on edit template in sidebar. A new edit notification template page will appear. Scroll down. There you will find an option <b>Add New Feed</b>. You can either create new feed or add this template to existing feeds.

</details>

<details>
 <summary>How to customize notification center?</summary>

Everything can be customized in Novu. <b>useNotification</b> hook in react component provides few functions to customize. <b>Header</b>, <b>Footer</b>, <b>Bell</b> etc can also be customized. Read more about customization [here](./react/react-components#custom-ui)

</details>

<details>
 <summary>Notification bell is not showing in iframe</summary>

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

</details>
