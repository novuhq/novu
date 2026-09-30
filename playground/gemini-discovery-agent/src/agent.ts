import { type AgentHandlerContext, agent } from '@novu/framework/express';
import { type Config, log, type TargetAgent } from './config.ts';
import { forward } from './forward/index.ts';
import { answerDirectly, type ClassifierInput, classify } from './route/gemini.ts';
import { type Decision, decideFromScores, type RouteState, readRouteState, recentHistory } from './route/policy.ts';

export const AGENT_ID = 'discovery-agent';
const ROUTE_KEY = 'route';
const DISCOVERY_AGENT_NAME = 'Discovery Agent';

export function createDiscoveryAgent(config: Config) {
  const agentsById = new Map(config.agents.map((target) => [target.id, target]));
  const agentIds = config.agents.map((target) => target.id);

  const saveRoute = (ctx: AgentHandlerContext, state: RouteState) => ctx.metadata.set(ROUTE_KEY, state);

  async function forwardTo(ctx: AgentHandlerContext, state: RouteState, target: TargetAgent, text: string) {
    await ctx.typing(target.targetId === 'deep_research' ? `${target.name} is working (this can take minutes)…` : `Asking ${target.name}…`);
    const started = Date.now();
    const hadSession = Boolean(state.sessions[target.id]);

    try {
      const result = await forward(config, target, text, state.sessions[target.id]);
      state.sessions[target.id] = result.session;
      state.current = target.id;
      saveRoute(ctx, state);
      log('forward_result', { conversationId: ctx.conversation.identifier, target: target.id, kind: result.kind, ms: Date.now() - started });

      if (result.kind === 'unreadable') {
        await ctx.reply(`**${target.name}:** This agent needs more input: open it in Gemini Enterprise.`);

        return;
      }
      const planHint =
        target.targetId === 'deep_research' && !hadSession && /research plan/i.test(result.text)
          ? '\n\n_Reply **Start Research** to run this plan (about 8 minutes), or suggest changes._'
          : '';
      await ctx.reply(`**${target.name}:** ${result.text}${planHint}`);
    } catch (err) {
      log('forward_failed', { conversationId: ctx.conversation.identifier, target: target.id, error: errorMessage(err), ms: Date.now() - started });
      await ctx.reply(`I couldn't reach ${target.name}. Open @${target.name} in Gemini Enterprise and ask there.`);
    }
  }

  async function replyDirect(ctx: AgentHandlerContext, text: string) {
    const answer = await answerDirectly(config, text, recentHistory(ctx.history, text), config.agents);
    await ctx.reply(`**${DISCOVERY_AGENT_NAME}:** ${answer}`);
  }

  async function execute(ctx: AgentHandlerContext, state: RouteState, decision: Decision, text: string) {
    if (decision.action === 'forward') {
      await forwardTo(ctx, state, agentsById.get(decision.agentId)!, text);
    } else {
      await replyDirect(ctx, text);
    }
  }

  return agent(AGENT_ID, {
    // Every message is classified, so naming another agent's topic switches agents; the classifier keeps
    // short follow-ups (an answer to the current agent's question) with the current agent.
    onMessage: async (message, ctx) => {
      const text = message.text.trim();
      if (!text) return;

      const state = readRouteState(ctx.metadata.get(ROUTE_KEY));
      const input: ClassifierInput = {
        text,
        current: state.current ? agentsById.get(state.current) : undefined,
        history: recentHistory(ctx.history, text),
        agents: config.agents,
      };
      const started = Date.now();
      const scores = await classify(config, input);
      const decision = decideFromScores(state, scores, agentIds);
      log('route_decision', {
        conversationId: ctx.conversation.identifier,
        current: state.current,
        ...decision,
        scores,
        classifyMs: Date.now() - started,
      });
      await execute(ctx, state, decision, text);
    },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
