import { serve } from "@novu/framework/next";
import { welcomeOnboardingEmail } from "../../novu/workflows";

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeOnboardingEmail],
});
