---
sidebar_position: 7
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
 <summary>There is render error due to notification center in react.</summary>

Notification center should be wrapped in <code>NovuProvider</code>.

</details>

<details>
 <summary>What socket events are supported in useSocket hook?</summary>

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

Everything can be customized in Novu. useNotification hook in react component provides few functions to customize. Header, Footer, Bell etc can also be customized. Read more about customization [here](./react/react-components#custom-ui)

</details>
