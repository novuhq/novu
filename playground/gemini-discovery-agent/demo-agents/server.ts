// One A2A server per Cloud Run service; AGENT picks the persona. Usage: AGENT=people node server.ts
import { randomUUID } from 'node:crypto';
import type { AgentCard, Message, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from '@a2a-js/sdk';
import { AGENT_CARD_PATH } from '@a2a-js/sdk';
import type { AgentExecutor, ExecutionEventBus, RequestContext, TaskStore } from '@a2a-js/sdk/server';
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server';
import { agentCardHandler, jsonRpcHandler, restHandler, UserBuilder } from '@a2a-js/sdk/server/express';
import express from 'express';
import { agentCardFor, PERSONAS, respond } from './personas.ts';

const PORT = Number(process.env.PORT ?? 8080);
const AGENT_URL = process.env.AGENT_URL ?? `http://localhost:${PORT}`;
const persona = PERSONAS[process.env.AGENT ?? ''];
if (!persona) throw new Error(`AGENT must be one of: ${Object.keys(PERSONAS).join(', ')}`);

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ severity: 'INFO', agent: persona.id, event, ...data }));
}

const agentCard: AgentCard = agentCardFor(persona, AGENT_URL);

// Cloud Run scales to zero: a follow-up carrying a taskId may reach a fresh instance, so a store miss
// becomes an empty task instead of TaskNotFound.
class ColdStartTolerantTaskStore implements TaskStore {
  private inner = new InMemoryTaskStore();

  async load(taskId: string): Promise<Task | undefined> {
    return (
      (await this.inner.load(taskId)) ?? {
        kind: 'task',
        id: taskId,
        contextId: '',
        status: { state: 'input-required', timestamp: new Date().toISOString() },
        history: [],
        metadata: { reconstructedAfterStoreMiss: true },
      }
    );
  }

  async save(task: Task): Promise<void> {
    await this.inner.save(task);
  }
}

// The Gemini Enterprise A2A proxy drops taskId on follow-ups but keeps contextId, so the open
// question is tracked per contextId (in memory).
const pendingByContext = new Map<string, number>();

class PersonaExecutor implements AgentExecutor {
  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    const { taskId, contextId, userMessage, task } = ctx;
    const text = userMessage.parts
      .flatMap((part) => (part.kind === 'text' ? [part.text] : []))
      .join(' ')
      .trim();

    if (!task || task.metadata?.reconstructedAfterStoreMiss) {
      bus.publish({
        kind: 'task',
        id: taskId,
        contextId,
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [userMessage],
      } satisfies Task);
    }
    bus.publish(statusUpdate(taskId, contextId, 'working', false));

    const reply = respond(persona, text, pendingByContext.get(contextId));
    log('turn', { taskId, contextId, userText: text, pending: pendingByContext.get(contextId), reply });

    if (reply.kind === 'ask') {
      pendingByContext.set(contextId, reply.intent);
      bus.publish(statusUpdate(taskId, contextId, 'input-required', true, agentMessage(taskId, contextId, reply.text)));
      bus.finished();

      return;
    }

    pendingByContext.delete(contextId);
    bus.publish({
      kind: 'artifact-update',
      taskId,
      contextId,
      artifact: { artifactId: randomUUID(), name: 'answer', parts: [{ kind: 'text', text: reply.text }] },
      lastChunk: true,
    } satisfies TaskArtifactUpdateEvent);
    bus.publish(statusUpdate(taskId, contextId, 'completed', true, agentMessage(taskId, contextId, reply.text)));
    bus.finished();
  }

  cancelTask = async (taskId: string, bus: ExecutionEventBus): Promise<void> => {
    bus.publish(statusUpdate(taskId, '', 'canceled', true));
    bus.finished();
  };
}

function agentMessage(taskId: string, contextId: string, text: string): Message {
  return { kind: 'message', messageId: randomUUID(), role: 'agent', parts: [{ kind: 'text', text }], taskId, contextId };
}

function statusUpdate(
  taskId: string,
  contextId: string,
  state: TaskStatusUpdateEvent['status']['state'],
  final: boolean,
  message?: Message
): TaskStatusUpdateEvent {
  return { kind: 'status-update', taskId, contextId, status: { state, message, timestamp: new Date().toISOString() }, final };
}

const requestHandler = new DefaultRequestHandler(agentCard, new ColdStartTolerantTaskStore(), new PersonaExecutor());
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use('/', restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use('/', jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

app.listen(PORT, () => log('server_started', { port: PORT, agentUrl: AGENT_URL }));
