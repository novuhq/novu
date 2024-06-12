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
      subject: `New Job HVAC`,
      body: `<html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>New Job HVAC</title>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>New Job HVAC</h1>
          <p>Hello Alan Turing,</p>
          <p>Alan <a href="mailto:alan.turing@example.com">alan.turing@example.com</a> has invited you to the HVAC</p>
          <p>A brilliant British mind, cracked Nazi codes in WWII and is considered the father of theoretical computer science
            and artificial intelligence.</p>
        </body>
        </html>`,
    };
  });
});
