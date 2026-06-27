import type {
  PlanHandle,
  PlanProgressEvent,
  PlanStep,
  PlanStepOpts,
  PlanStepUpdate,
  PlanTaskInput,
} from './agent.types';

type PlanPostFn = (event: PlanProgressEvent) => Promise<void>;

type PlanHandleDeps = {
  post: PlanPostFn;
  onTitleChange: (title: string) => void;
  finalize: (phase: 'finished' | 'failed', title?: string) => Promise<void>;
  registerDrain: (drain: () => Promise<void>) => void;
};

class PlanStepImpl implements PlanStep {
  constructor(
    private readonly handle: PlanHandleImpl,
    private readonly id: string
  ) {}

  update(opts: PlanStepUpdate): this {
    this.handle.upsertTask(this.id, { status: 'in_progress', ...opts });

    return this;
  }

  done(details?: string): this {
    this.handle.upsertTask(this.id, { status: 'complete', ...(details ? { details } : {}) });

    return this;
  }

  fail(details?: string): this {
    this.handle.upsertTask(this.id, { status: 'error', ...(details ? { details } : {}) });

    return this;
  }
}

class PlanHandleImpl implements PlanHandle {
  private readonly queue: { tail: Promise<void> };
  private cardTitle: string | undefined;

  constructor(
    private readonly deps: PlanHandleDeps,
    initialTitle?: string
  ) {
    this.queue = { tail: Promise.resolve() };
    this.cardTitle = initialTitle;
    deps.registerDrain(() => this.queue.tail);
    this.enqueue({ kind: 'title', ...(initialTitle !== undefined ? { title: initialTitle } : {}) });
  }

  /** @internal Used by trackPlanTools — do not call directly. */
  upsertTask(id: string, task: Omit<PlanTaskInput, 'id'>): void {
    this.enqueue({
      kind: 'task',
      task: { id, ...task },
      ...(this.cardTitle ? { cardTitle: this.cardTitle } : {}),
    });
  }

  title(text: string): this {
    this.cardTitle = text;
    this.deps.onTitleChange(text);
    this.enqueue({ kind: 'title', title: text });

    return this;
  }

  step<T>(title: string, fn: () => Promise<T>, opts?: PlanStepOpts): Promise<T>;
  step(title: string, opts?: PlanStepOpts): PlanStep;
  step<T>(
    title: string,
    fnOrOpts?: (() => Promise<T>) | PlanStepOpts,
    maybeOpts?: PlanStepOpts
  ): Promise<T> | PlanStep {
    if (typeof fnOrOpts === 'function') {
      const fn = fnOrOpts;
      const opts = maybeOpts;
      const id = nextStepId();

      this.upsertTask(id, { title, status: 'in_progress', ...opts });

      return (async () => {
        try {
          const result = await fn();
          this.upsertTask(id, { status: 'complete' });

          return result;
        } catch (err) {
          this.upsertTask(id, {
            status: 'error',
            details: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      })();
    }

    const opts = fnOrOpts;
    const id = nextStepId();

    this.upsertTask(id, { title, status: 'in_progress', ...opts });

    return new PlanStepImpl(this, id);
  }

  finish(title?: string): Promise<void> {
    const resolvedTitle = title ?? this.cardTitle;

    return this.enqueueAwait(() => this.deps.finalize('finished', resolvedTitle));
  }

  fail(title?: string): Promise<void> {
    const resolvedTitle = title ?? this.cardTitle;

    return this.enqueueAwait(() => this.deps.finalize('failed', resolvedTitle));
  }

  private enqueue(event: PlanProgressEvent): void {
    this.queue.tail = this.queue.tail.then(() => this.deps.post(event)).catch(() => undefined);
  }

  private enqueueAwait(fn: () => Promise<void>): Promise<void> {
    const job = this.queue.tail.then(fn);
    this.queue.tail = job.catch(() => undefined);

    return job;
  }
}

export function createPlanHandle(deps: PlanHandleDeps, initialTitle?: string): PlanHandle {
  return new PlanHandleImpl(deps, initialTitle);
}

function nextStepId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
