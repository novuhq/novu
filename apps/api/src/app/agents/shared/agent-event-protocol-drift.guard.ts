import type {
  AgentEvent as FrameworkAgentEvent,
  AgentEventEnvelope as FrameworkAgentEventEnvelope,
} from '@novu/framework/internal';
import type { AgentEvent as SharedAgentEvent, AgentEventEnvelope as SharedAgentEventEnvelope } from '@novu/shared';

/**
 * `@novu/framework`'s `agent-event-protocol.ts` intentionally duplicates the `AgentEvent`
 * wire types owned by `@novu/shared` (the framework package cannot depend on `@novu/shared`
 * yet). That duplication has no compiler-enforced link, so a change to one side that isn't
 * mirrored on the other would only surface at runtime as an ingest/ack protocol mismatch.
 *
 * This file has no runtime behavior — it exists purely so a structural drift between the two
 * copies fails `tsc`, not production traffic. If it stops compiling, update whichever of
 * `packages/shared/src/types/agent-events.ts` or
 * `packages/framework/src/resources/agent/agent-event-protocol.ts` fell behind.
 */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type _AgentEventDriftGuard = Expect<Equal<SharedAgentEvent, FrameworkAgentEvent>>;
export type _AgentEventEnvelopeDriftGuard = Expect<Equal<SharedAgentEventEnvelope, FrameworkAgentEventEnvelope>>;
