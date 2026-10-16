// What can go wrong in the box's commands. main.ts prints any of them as `ERROR: <message>` and exits 1.

import { Schema } from 'effect';

// A command exited non-zero (or by a signal: `exitCode` null), or couldn't start.
export class CommandFailed extends Schema.TaggedError<CommandFailed>()('CommandFailed', {
  message: Schema.String,
  exitCode: Schema.NullOr(Schema.Number),
}) {}

// Another bake or apply holds the lock.
export class LockTaken extends Schema.TaggedError<LockTaken>()('LockTaken', { message: Schema.String }) {}

// A wait ran out: a health check, the stores, a process stop.
export class TimedOut extends Schema.TaggedError<TimedOut>()('TimedOut', { message: Schema.String }) {}

// An HTTP call (the box's API, Clerk, Stripe, GitHub, the bridge) failed or answered an error.
export class RequestFailed extends Schema.TaggedError<RequestFailed>()('RequestFailed', {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
}) {}

// The box isn't in a state the command can run in, or a file in /data isn't what it should be.
export class BoxError extends Schema.TaggedError<BoxError>()('BoxError', { message: Schema.String }) {}
