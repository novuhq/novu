# SMS77

It is possible to use the [Pinpoint](https://aws.amazon.com/pinpoint/) provider to send SMS messages to the customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To integrate AWS Pinpoint on the Novu platform, you will need to have in AWS, an IAM user who has the `sms-voice:SendTextMessage` permission.

## Create User

To create a user, login to AWS Console and follow these steps:

- Go to `IAM` service page.
- Create a new user with `sms-voice:SendTextMessage` permission, or add `sms-voice:SendTextMessage` permission to an existing user.
- Add `Access Key` credential to the user and copy `Access key ID` and `Secret access key`.

For security reasons, it is suggested that you create a new User to use with Novu.

## Create an AWS Pinpoint integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate **Amazon Pinpoint** and click on the **Connect** button.
- Enter your `Access key ID`, `Secret access key`, and `AWS region`.
- Click on the **Save** button.
- You should now be able to send SMS notifications using **Amazon Pinpoint** in Novu.
