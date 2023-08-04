---
sidebar_position: 13
sidebar_label: Default Providers
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Novu Providers

To help you evaluate our services better, Novu provides an email and sms provider by default for every account. After signing up, you can go to the [Integrations store](https://web.novu.co/integrations) on the Novu web dashboard to see this. 

For a newly signed-up account, it looks like this:

![Email providers on Novu web dashboard's Integration store](https://res.cloudinary.com/dxc6bnman/image/upload/v1691175129/guides/SCR-20230805-bhlg_k6ents.png)

And this is the default sms provider:

![default sms provider ](https://res.cloudinary.com/dxc6bnman/image/upload/v1691175293/guides/SCR-20230805-bisg_ej2dgr.png)


> Note that the default email and sms providers are for evaluation purpose only and their use in production-grade apps is not recommended. You should switch to any of our numerous other providers for production apps.

In addition to email and sms, we also have in-app provider:

![default provider for in-app channel](https://res.cloudinary.com/dxc6bnman/image/upload/v1691175806/guides/SCR-20230805-blto_gcxrjr.png)

It is the only provider for the in-app channel and it *can be used in production apps*. Unlike sms and email, it is not active by default and needs to be turned on separately. It can be scaled as per your need and it is a 'pay as you go' offering. You can check [this](https://novu.co/pricing/) for more details.

Following are the limits for our email and sms providers:

1. Email: 300 emails per organization per month
2. SMS: 20 messages per organization per month

To send more than these limits, you can configure a different provider for a specific channels. Read more about them [here](https://docs.novu.co/platform/integrations/).
