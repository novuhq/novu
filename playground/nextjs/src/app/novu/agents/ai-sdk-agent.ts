import { anthropic } from '@ai-sdk/anthropic';
import { agent, hydrateUnreachableAttachmentUrls, toModelMessages } from '@novu/framework/ai-sdk';
import { generateText, stepCountIs, tool } from 'ai';
import { agentTools, describeAction, MODEL, SYSTEM } from './features';
import { scriptedAiSdkModel } from './scripted-models';

const model = () => (process.env.ANTHROPIC_API_KEY ? anthropic(MODEL) : scriptedAiSdkModel);

/** Claude Haiku (scripted without `ANTHROPIC_API_KEY`) with every feature as a tool, plus attached images and PDFs. */
export const aiSdkAgent = agent('ai-sdk-agent', {
  onMessage: async (_message, ctx) =>
    generateText({
      model: model(),
      system: SYSTEM,
      messages: await hydrateUnreachableAttachmentUrls(toModelMessages(ctx)),
      stopWhen: stepCountIs(5),
      tools: Object.fromEntries(
        Object.entries(agentTools(ctx)).map(([name, spec]) => [
          name,
          tool({
            description: spec.description,
            inputSchema: spec.schema,
            needsApproval: spec.needsApproval,
            execute: spec.run,
          }),
        ])
      ),
    }),
  onAction: (action) => describeAction(action),
});
