import { serve } from "@novu/framework/next";
import { myWorkflow } from "../../novu/workflows";

export const { GET, POST, OPTIONS } = serve({ workflows: [myWorkflow] });
