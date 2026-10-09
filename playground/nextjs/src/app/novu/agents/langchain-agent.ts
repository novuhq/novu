import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { agent, toLangChainMessages } from '@novu/framework/langchain';
import { agentTools, describeAction, formatHumanResponse, MODEL, SYSTEM } from './features';
import { ScriptedChatModel } from './scripted-models';

const model = () => (process.env.ANTHROPIC_API_KEY ? new ChatAnthropic({ model: MODEL }) : new ScriptedChatModel({}));

/** Claude Haiku (scripted without `ANTHROPIC_API_KEY`) with every feature as a tool, plus attached images and PDFs. */
export const langchainAgent = agent('langchain-agent', {
  onMessage: (_message, ctx) => {
    const tools = agentTools(ctx);

    return {
      model: model(),
      system: SYSTEM,
      tools: Object.entries(tools).map(([name, spec]) =>
        tool(spec.run, { name, description: spec.description, schema: spec.schema })
      ),
      needsApproval: (toolCall) => Boolean(tools[toolCall.name]?.needsApproval),
    };
  },
  // Novu calls the model again after a tool approval, but not after an approve/choose answer, and the
  // answer isn't part of `toLangChainMessages`, so it's handed to the model here.
  onAction: async (action, ctx) => {
    if (!ctx.humanResponse) return describeAction(action);
    const reply = await model().invoke([
      ...toLangChainMessages(ctx, SYSTEM),
      new HumanMessage(formatHumanResponse(ctx.humanResponse)),
    ]);

    return reply.text;
  },
});
