import { type AgentHandlerContext, agent } from '@novu/framework/express';
import { answerDirectly } from './answer.ts';
import { classify } from './classify.ts';
import { agentById, type TargetAgent } from './config.ts';
import { forward } from './forward/index.ts';
import { log } from './log.ts';
import { conversationPrompt } from './prompt.ts';

/** Saved in conversation metadata: the agent the user is talking to, and each agent's Gemini Enterprise session. */
type RouteState = { current?: string; sessions: Record<string, string> };

const ROUTE_KEY = 'route';

export const discoveryAgent = agent('discovery-agent', {
  onMessage: async (message, ctx) => {
    const text = message.text.trim();
    if (!text) return;

    const state = (ctx.metadata.get(ROUTE_KEY) as RouteState | undefined) ?? { sessions: {} };
    const prompt = conversationPrompt(ctx.history, text);

    // Every message is classified, so a follow-up stays with the current agent and a new topic switches.
    const started = Date.now();
    const { agent: choice, confidence } = await classify(prompt, agentById(state.current));
    log('route', { conversationId: ctx.conversation.identifier, current: state.current, choice, confidence, ms: Date.now() - started });

    // Forward only when the classifier is sure; otherwise Gemini answers, asking which agent the user means.
    const target = confidence === 'high' ? agentById(choice) : undefined;
    if (target) {
      await forwardTo(ctx, state, target, text);
    } else {
      await ctx.reply(`**Discovery Agent:** ${await answerDirectly(prompt)}`);
    }
  },
});

async function forwardTo(ctx: AgentHandlerContext, state: RouteState, target: TargetAgent, text: string) {
  const isDeepResearch = target.targetId === 'deep_research';
  const session = state.sessions[target.id];
  await ctx.typing(isDeepResearch ? `${target.name} is working (this can take minutes)…` : `Asking ${target.name}…`);
  const started = Date.now();

  try {
    const reply = await forward(target, text, session);
    ctx.metadata.set(ROUTE_KEY, { current: target.id, sessions: { ...state.sessions, [target.id]: reply.session } });
    log('forward', { conversationId: ctx.conversation.identifier, target: target.id, answered: Boolean(reply.text), ms: Date.now() - started });

    if (!reply.text) {
      await ctx.reply(`**${target.name}:** This agent needs more input: open it in Gemini Enterprise.`);

      return;
    }

    const startHint =
      isDeepResearch && !session && /research plan/i.test(reply.text)
        ? '\n\n_Reply **Start Research** to run this plan (about 8 minutes), or suggest changes._'
        : '';
    await ctx.reply(`**${target.name}:** ${reply.text}${startHint}`);
  } catch (err) {
    log('forward_failed', { conversationId: ctx.conversation.identifier, target: target.id, error: String(err), ms: Date.now() - started });
    await ctx.reply(`I couldn't reach ${target.name}. Open @${target.name} in Gemini Enterprise and ask there.`);
  }
}
