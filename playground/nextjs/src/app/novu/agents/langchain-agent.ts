import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { agent } from '@novu/framework/langchain';
import { agentTools, describeAction, MODEL, SYSTEM } from './features';
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
  onAction: (action) => describeAction(action),
});
