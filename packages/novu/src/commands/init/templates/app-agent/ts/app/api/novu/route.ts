import { serve } from '@novu/framework/next';
import { supportAgent } from '../../novu/agents';

export const { GET, POST, OPTIONS } = serve({
  agents: [supportAgent],
});
