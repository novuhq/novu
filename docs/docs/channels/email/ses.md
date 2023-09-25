---
sidebar_position: 2
---

import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

# Amazon SES

You can use the [Amazon SES](https://aws.amazon.com/ses/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Amazon SES provider in the email channel, you will need to create a SES account and add your credentials to the Amazon SES integration on the Novu platform.

## How to set up SES in AWS?

- Either use root aws account or create a new IAM account with appropriate permission policies.
- Create new access key and save generated `ACCESS_KEY_ID` and `ACCESS_SECRET_KEY` carefully
- Choose Amazon Simple Email Service.
- Create new identity.
- Either choose domain or email.
- Verify your domain (by adding few DNS records as mentioned in SES instructions) or email (AWS sends a verification email to your email).
- Verify recipient email also by creating new email identity type [only in sandbox mode].
- Test if your SES is setup correctly using test email feature.

## Create a SES integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Amazon SES and click on the **Connect** button.
- Enter previously saved `ACCESS_KEY_ID` and `ACCESS_SECRET_KEY`.
- Fill the `From email address` field using the authenticated sender email id in previous step.
- Enter `region` and `Sender name` also.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Amazon SES in Novu.

## FAQ

<FAQ>
<FAQItem title="Trigger from novu is successful but subscriber is not receiving email.">

Possible reasons:

- You have not verified subscriber's email address in SES (if you are in sandbox environment).
- Your daily sending limit has reached (if you are in sandbox environment).
- You have entered wrong aws region in integration form.

</FAQItem>
</FAQ>
