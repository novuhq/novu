import { randomUUID } from 'node:crypto';
import { Actions, type AgentHandlerContext, agent, Button, Card, CardText } from '@novu/framework/express';
import { type Config, DIRECT, log, type TargetAgent } from './config.ts';
import { forward } from './forward/index.ts';
import { classify } from './route/classify.ts';
import { answerDirectly } from './route/gemini.ts';
import type { ClassifierInput } from './route/jev.ts';
import {
  type Decision,
  decideBeforeClassify,
  decideFromScores,
  type RouteState,
  readRouteState,
  recentHistory,
  truncate,
} from './route/policy.ts';

export const AGENT_ID = 'discovery-agent';
const ROUTE_KEY = 'route';
const CHANGE_AGENT_ACTION = 'change_agent';
const PICK_AGENT_ACTION = 'pick_agent';
// Slack section blocks cap text at 3000 characters; longer answers go out as markdown plus a button card.
const MAX_CARD_TEXT = 2800;
const DISCOVERY_AGENT_NAME = 'Discovery Agent';

export function createDiscoveryAgent(config: Config) {
  const agentsById = new Map(config.agents.map((target) => [target.id, target]));
  const agentIds = config.agents.map((target) => target.id);

  const saveRoute = (ctx: AgentHandlerContext, state: RouteState) => ctx.metadata.set(ROUTE_KEY, state);

  async function replyAnswer(ctx: AgentHandlerContext, target: TargetAgent, text: string) {
    const labelled = `**${target.name}:** ${text}`;
    const changeButton = Actions([Button({ id: CHANGE_AGENT_ACTION, label: 'Change agent' })]);
    if (labelled.length <= MAX_CARD_TEXT) {
      await ctx.reply(Card({ children: [CardText(labelled), changeButton] }));

      return;
    }
    await ctx.reply(labelled);
    await ctx.reply(Card({ children: [CardText(`Answered by ${target.name}.`), changeButton] }));
  }

  async function forwardTo(ctx: AgentHandlerContext, state: RouteState, target: TargetAgent, text: string) {
    await ctx.typing(target.path === 'stream_assist' ? `${target.name} is working (this can take minutes)…` : `Asking ${target.name}…`);
    const started = Date.now();
    const hadSession = Boolean(state.sessions[target.id]);

    try {
      const result = await forward(config, target, text, state.sessions[target.id]);
      state.sessions[target.id] = result.session;
      state.current = target.id;
      state.lastForwarded = text;
      if (result.kind === 'question') state.waiting = target.id;
      else delete state.waiting;
      saveRoute(ctx, state);
      log('forward_result', { conversationId: ctx.conversation.identifier, target: target.id, kind: result.kind, ms: Date.now() - started });

      if (result.kind === 'unreadable') {
        await replyAnswer(ctx, target, 'This agent needs more input: open it in Gemini Enterprise.');

        return;
      }
      const planHint =
        target.targetId === 'deep_research' && !hadSession && /research plan/i.test(result.text)
          ? '\n\n_Reply **Start Research** to run this plan (about 8 minutes), or suggest changes._'
          : '';
      await replyAnswer(ctx, target, result.text + planHint);
    } catch (err) {
      delete state.waiting;
      saveRoute(ctx, state);
      log('forward_failed', { conversationId: ctx.conversation.identifier, target: target.id, error: errorMessage(err), ms: Date.now() - started });
      await ctx.reply(
        Card({
          title: `Open @${target.name}`,
          children: [CardText(`I couldn't reach ${target.name}. Open @${target.name} in Gemini Enterprise and ask there.`)],
        })
      );
    }
  }

  async function replyDirect(ctx: AgentHandlerContext, text: string) {
    const answer = await answerDirectly(config, text, recentHistory(ctx.history, text), config.agents);
    await ctx.reply(`**${DISCOVERY_AGENT_NAME}:** ${answer}`);
  }

  // Plain buttons rather than ctx.choose: human interactions need a Novu subscriber, which Gemini Enterprise users are not.
  async function askToChoose(ctx: AgentHandlerContext, state: RouteState, question: string, candidates: string[], text: string) {
    const ids = candidates.length >= 2 ? candidates : [...candidates, DIRECT];
    const requestId = randomUUID();
    const options = ids.map((id, index) => ({
      id: `a${index + 1}`,
      label: id === DIRECT ? `${DISCOVERY_AGENT_NAME} (answer directly)` : (agentsById.get(id)?.name ?? id),
    }));
    state.pending = { requestId, text, options: Object.fromEntries(options.map((option, index) => [option.id, ids[index]])) };
    saveRoute(ctx, state);
    await ctx.reply(
      Card({
        title: question,
        children: [
          CardText(truncate(text, 150)),
          Actions(options.map((option) => Button({ id: PICK_AGENT_ACTION, label: option.label, value: `${requestId}:${option.id}` }))),
        ],
      })
    );
  }

  async function execute(ctx: AgentHandlerContext, state: RouteState, decision: Decision, text: string) {
    if (decision.action === 'forward') {
      await forwardTo(ctx, state, agentsById.get(decision.agentId)!, text);
    } else if (decision.action === 'direct') {
      await replyDirect(ctx, text);
    } else {
      await askToChoose(ctx, state, 'Which agent should answer this?', decision.candidates, text);
    }
  }

  return agent(AGENT_ID, {
    onMessage: async (message, ctx) => {
      const text = message.text.trim();
      if (!text) return;

      const state = readRouteState(ctx.metadata.get(ROUTE_KEY));
      const logBase = { conversationId: ctx.conversation.identifier, current: state.current, waiting: state.waiting };
      const early = decideBeforeClassify(state, agentIds);
      if (early) {
        log('route_decision', { ...logBase, ...early });
        await execute(ctx, state, early, text);

        return;
      }

      const input: ClassifierInput = {
        text,
        current: state.current ? agentsById.get(state.current) : undefined,
        history: recentHistory(ctx.history, text),
        agents: config.agents,
      };
      const started = Date.now();
      const { scores, jevError } = await classify(config, input);
      const decision = decideFromScores(state, scores, agentIds);
      log('route_decision', { ...logBase, ...decision, scores, jevError, classifyMs: Date.now() - started });
      await execute(ctx, state, decision, text);
    },

    onAction: async (action, ctx) => {
      const state = readRouteState(ctx.metadata.get(ROUTE_KEY));

      if (action.id === PICK_AGENT_ACTION) {
        const [requestId, optionId] = (action.value ?? '').split(':');
        const pending = state.pending;
        if (!pending || pending.requestId !== requestId) {
          log('choice_stale', { conversationId: ctx.conversation.identifier, requestId });

          return 'That choice is no longer active. Send your message again.';
        }
        delete state.pending;
        saveRoute(ctx, state);

        const picked = pending.options[optionId];
        log('choice_picked', { conversationId: ctx.conversation.identifier, optionId, picked });
        if (!picked) return 'That choice is no longer active. Send your message again.';
        if (picked === DIRECT) return replyDirect(ctx, pending.text);
        const target = agentsById.get(picked);
        if (!target) return `Agent ${picked} is no longer available.`;

        return forwardTo(ctx, state, target, pending.text);
      }

      if (action.id === CHANGE_AGENT_ACTION) {
        delete state.waiting;
        if (!state.lastForwarded) {
          saveRoute(ctx, state);

          return 'There is no forwarded message to re-send yet. Ask a question first.';
        }
        log('change_agent', { conversationId: ctx.conversation.identifier, current: state.current });
        await askToChoose(ctx, state, 'Which agent should answer instead?', agentIds, state.lastForwarded);
      }
    },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
