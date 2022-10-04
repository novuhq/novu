# AWS SNS

You can use the [AWS SNS](https://aws.amazon.com/sns/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To integrate AWS SNS on the Novu platform., you need IAM user who has access to `sns:Publish` Action.

## Create User

To create user, login to AWS Console and follow this steps,

- Go to `IAM` service page
- Create new user who has `sns:Publish` permission, or add `sns:Publish` permission to existing user
- Add `Access Key` credential to user and copy `Access key ID` and `Secret access key`

It is suggested that you create a new User to use with Novu.

## Create a AWS SNS integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on the Novu.
- Locate **Amazon SNS** and click on the **Connect** button.
- Enter your `Access key ID` and `Secret access key`.
- Click on the **Save** button.
- You should now be able to send notifications using **Amazon SNS** in Novu.
