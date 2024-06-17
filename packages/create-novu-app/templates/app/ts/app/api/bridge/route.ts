import { serve } from "@novu/framework/next";
import { Client } from "@novu/framework";
import { myWorkflow } from "../../workflow/myWorkflow";

const client = new Client({ strictAuthentication: false });

export const { GET, POST, PUT, OPTIONS } = serve({
  client,
  workflows: [myWorkflow],
});
