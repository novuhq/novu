import { anthropic } from '@ai-sdk/anthropic';
import { agent, hydrateUnreachableAttachmentUrls, toModelMessages } from '@novu/framework/ai-sdk';
import { generateText, stepCountIs, tool } from 'ai';
import { agentTools, describeAction, formatHumanResponse, MODEL, SYSTEM } from './features';
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
  // Novu calls the model again after a tool approval, but not after an approve/choose answer, and the
  // answer isn't part of `toModelMessages`, so it's handed to the model here.
  onAction: async (action, ctx) => {
    if (!ctx.humanResponse) return describeAction(action);
    const { text } = await generateText({
      model: model(),
      system: SYSTEM,
      messages: [...toModelMessages(ctx), { role: 'user', content: formatHumanResponse(ctx.humanResponse) }],
    });

    return text;
  },
});
