import { workflow } from "@novu/framework";
import { renderEmail } from "../../emails/novu-onboarding-email";
import { zodControlSchema, zodPayloadSchema } from "./schemas";

export const welcomeOnboardingEmail = workflow(
  "welcome-onboarding-email",
  async ({ step, payload }) => {
    await step.email(
      "send-email",
      async (controls) => {
        return {
          subject: "A Successful Test on Novu!",
          body: renderEmail(controls, payload),
        };
      },
      {
        controlSchema: zodControlSchema,
      },
    );
  },
  {
    payloadSchema: zodPayloadSchema,
  },
);
