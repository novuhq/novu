import { Echo } from "@novu/echo";

export const echo = new Echo({
  /**
   * Enable this flag only during local development
   */
  devModeBypassAuthentication: process.env.NODE_ENV === "development",
});

echo.workflow("onboarding", async ({ step }) => {
  await step.email("send-email", async () => {
    return {
      subject: "Welcome to Novu! Ready to code?",
      body: `<html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <title>Notification workflows rooted in how YOU work</title>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
            <div style="text-align: center">
              <img width="200px" src="https://web.novu.co/static/images/logo.png" />
            </div>
            <h1>Notification workflows rooted in how YOU work</h1>
            <p>Hi!</p>
            <p>Good to have you here! We continuously work on giving you the flexibility to build any notification setup you need
              - through code, right from your IDE - and to give your manager an easy way to adjust the notification content. Check
              out our <a href="https://docs.novu.co/echo/quickstart">docs</a> to learn more.</p>
            <p>Questions or problems? Our <a href="https://discord.com/channels/895029566685462578/1019663407915483176">Discord
              support channel</a> is here for you.</p>
            <p>Feedback? Head over to our <a href="https://roadmap.novu.co/roadmap">public roadmap</a> to submit it, or simply
              poke us on Discord or via email. We’re here to make your life easier!</p>
            <p>Cheers,<br />Novu Team</p>
          </body>
        </html>`,
    };
  });
});
