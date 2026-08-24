import { serve } from '@novu/framework/next';
import { welcomeWorkflow } from '@/app/novu/workflows';

export const { GET, POST, OPTIONS } = serve({ workflows: [welcomeWorkflow] });
