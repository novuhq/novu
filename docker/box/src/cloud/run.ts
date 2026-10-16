// What the Durable Objects (host.ts, slack/) share to run Effect: one scheduler, timeouts as tagged errors, storage.

import { Effect, Scheduler, Schema } from 'effect';

// A container call (start, exec, snapshot) that threw.
export class ContainerFailed extends Schema.TaggedError<ContainerFailed>()('ContainerFailed', {
  message: Schema.String,
}) {}

export class TimedOut extends Schema.TaggedError<TimedOut>()('TimedOut', { message: Schema.String }) {}

// Every failure here carries a message for the logs and /__box/state.
export interface Failure {
  readonly message: string;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function attempt<A>(what: string, f: () => Promise<A>): Effect.Effect<A, ContainerFailed> {
  return Effect.tryPromise({
    try: f,
    catch: (error) => new ContainerFailed({ message: what ? `${what}: ${messageOf(error)}` : messageOf(error) }),
  });
}

export const within =
  (ms: number, what: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | TimedOut, R> =>
    Effect.timeoutOrElse(effect, {
      duration: ms,
      orElse: () => Effect.fail(new TimedOut({ message: `${what} took over ${ms / 1000} s` })),
    });

// As HttpRouter.toWebHandler's docs advise for Workers: Effect's own work stays in the request (or alarm) that started it.
const scheduler = new Scheduler.MixedScheduler('sync');

export function runPromise<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provideService(Scheduler.Scheduler, scheduler)));
}

// For a request's work that goes on after its answer (Slack wants one within 3 s).
export function later(ctx: DurableObjectState, what: string, effect: Effect.Effect<unknown, Failure>): void {
  ctx.waitUntil(runPromise(effect.pipe(Effect.catch((error) => log(`${what}: ${error.message}`)))));
}

export function log(message: string): Effect.Effect<void> {
  return Effect.sync(() => console.log(message));
}

export function stored<A>(storage: DurableObjectStorage, key: string): Effect.Effect<A | undefined> {
  return Effect.promise(() => storage.get<A>(key));
}

export function store(storage: DurableObjectStorage, key: string, value: unknown): Effect.Effect<void> {
  return Effect.promise(() => storage.put(key, value));
}

export function forget(storage: DurableObjectStorage, key: string): Effect.Effect<void> {
  return Effect.asVoid(Effect.promise(() => storage.delete(key)));
}
