# AWS SNS

You can use the [AWS SNS](https://aws.amazon.com/sns/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To integrate AWS SNS on the Novu platform, you will need to have in AWS, an IAM user who has the `sns:Publish` permission.

## Create User

To create a user, login to AWS Console and follow these steps:

- Go to `IAM` service page.
- Create a new user with `sns:Publish` permission, or add `sns:Publish` permission to an existing user.
- Add `Access Key` credential to the user and copy `Access key ID` and `Secret access key`.

For security reasons, it is suggested that you create a new User to use with Novu.

## Create an AWS SNS integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate **Amazon SNS** and click on the **Connect** button.
- Enter your `Access key ID` and `Secret access key`.
- Click on the **Save** button.
- You should now be able to send SMS notifications using **Amazon SNS** in Novu.
