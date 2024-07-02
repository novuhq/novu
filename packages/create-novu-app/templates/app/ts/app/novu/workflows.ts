/* eslint-disable max-len */
import { workflow } from "@novu/framework";

export const myWorkflow = workflow("onboarding", async ({ step }) => {
  await step.email("send-email", async () => {
    return {
      subject: "Welcome to Novu! Ready to code?",
      body: `<html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <title>Notification workflows rooted in how YOU work</title>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; background-color:#fff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img width="200px" src="https://dashboard.novu.co/static/images/logo.png" />
            </div>
            <h1 style="margin: 0; margin-bottom: 16px;">Notification workflows rooted in how YOU work</h1>
            <p style="margin: 0; margin-bottom: 8px;">Hi!</p>
            <p style="margin: 0; margin-bottom: 8px;">Good to have you here! We continuously work on giving you the flexibility to
              build any notification setup you need - through code, right from your IDE - and to give your managers an easy way to adjust the notification content. Check
              out our <a href="https://docs.novu.co/framework/quickstart">docs</a> to learn more.</p>
            <p style="margin: 0; margin-bottom: 8px;">Questions or problems? Our <a href="https://discord.com/channels/895029566685462578/1019663407915483176">Discord support channel</a> is here for you.</p>
            <p style="margin: 0; margin-bottom: 8px;">Feedback? Head over to our <a href="https://roadmap.novu.co/roadmap">public roadmap</a> to submit it, or simply poke us on Discord or via email. We’re here to make your life easier!</p>
            <p style="margin: 0;">Cheers,<br />Novu Team</p>
          </body>
        </html>`,
    };
  });
});
