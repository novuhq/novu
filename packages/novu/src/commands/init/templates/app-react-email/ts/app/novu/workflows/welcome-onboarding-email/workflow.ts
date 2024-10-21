import { workflow } from "@novu/framework";
import { renderEmail } from "../../emails/novu-onboarding-email";
import { emailControlSchema, payloadSchema } from "./schemas";

export const welcomeOnboardingEmail = workflow(
  "welcome-onboarding-email",
  async ({ step, payload }) => {
    await step.email(
      "send-email",
      async (controls) => {
        return {
          subject: controls.subject,
          body: renderEmail(controls, payload),
        };
      },
      {
        controlSchema: emailControlSchema,
      },
    );
  },
  {
    payloadSchema,
  },
);
