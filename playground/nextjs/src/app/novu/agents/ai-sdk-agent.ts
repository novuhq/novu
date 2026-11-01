import { anthropic } from '@ai-sdk/anthropic';
import { agent, hydrateUnreachableAttachmentUrls, toModelMessages } from '@novu/framework/ai-sdk';
import { stepCountIs, streamText, tool } from 'ai';
import { agentTools, channelHandlers, MODEL, SYSTEM } from './features';
import { scriptedAiSdkModel } from './scripted-models';

const model = () => (process.env.ANTHROPIC_API_KEY ? anthropic(MODEL) : scriptedAiSdkModel);

/** Claude Haiku (scripted without `ANTHROPIC_API_KEY`) with every feature but HITL as a tool, plus attached images and PDFs. Returning `streamText` streams the reply as the model writes it. */
export const aiSdkAgent = agent('ai-sdk-agent', {
  ...channelHandlers,
  onMessage: async (message, ctx) =>
    streamText({
      model: model(),
      system: SYSTEM,
      messages: await hydrateUnreachableAttachmentUrls(toModelMessages(ctx)),
      stopWhen: stepCountIs(5),
      tools: Object.fromEntries(
        Object.entries(agentTools(ctx, message)).map(([name, spec]) => [
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
});
