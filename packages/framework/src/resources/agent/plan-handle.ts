import type {
  PlanHandle,
  PlanProgressEvent,
  PlanProgressPhase,
  PlanStep,
  PlanStepOpts,
  PlanStepUpdate,
  PlanTaskInput,
} from './agent.types';

type PlanPostFn = (event: PlanProgressEvent) => Promise<void>;

export interface InternalPlanHandle extends PlanHandle {
  upsertTask(id: string, task: Omit<PlanTaskInput, 'id'>): void;
  pauseForApproval(): Promise<void>;
  autoFinalize(phase: 'finished' | 'failed'): Promise<void>;
}

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

class PlanHandleImpl implements InternalPlanHandle {
  private readonly queue: { tail: Promise<void> };
  private cardTitle: string | undefined;
  private finalized = false;
  private pausedForApproval = false;

  constructor(
    private readonly post: PlanPostFn,
    initialTitle?: string
  ) {
    this.queue = { tail: Promise.resolve() };
    this.cardTitle = initialTitle;
    this.enqueue({ kind: 'title', ...(initialTitle !== undefined ? { title: initialTitle } : {}) });
  }

  upsertTask(id: string, task: Omit<PlanTaskInput, 'id'>): void {
    this.enqueue({
      kind: 'task',
      task: { id, ...task },
      ...(this.cardTitle ? { cardTitle: this.cardTitle } : {}),
    });
  }

  title(text: string): this {
    this.cardTitle = text;
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
    return this.finalize('finished', title);
  }

  fail(title?: string): Promise<void> {
    return this.finalize('failed', title);
  }

  pauseForApproval(): Promise<void> {
    this.pausedForApproval = true;

    return this.enqueuePhase('awaiting-approval');
  }

  autoFinalize(phase: 'finished' | 'failed'): Promise<void> {
    if (phase === 'finished' && this.pausedForApproval) {
      return Promise.resolve();
    }

    return this.finalize(phase);
  }

  private finalize(phase: 'finished' | 'failed', title?: string): Promise<void> {
    if (this.finalized) {
      return Promise.resolve();
    }
    this.finalized = true;

    return this.enqueuePhase(phase, title);
  }

  private enqueuePhase(phase: PlanProgressPhase, title?: string): Promise<void> {
    // Phase titles come from the API (planTitleForPhase) unless the author passed title to finish()/fail().
    return this.enqueueAwait(() => this.post({ kind: 'phase', phase, ...(title ? { title } : {}) }));
  }

  private enqueue(event: PlanProgressEvent): void {
    // Plan progress is best-effort UI — a failed post must not break the agent turn.
    this.queue.tail = this.queue.tail.then(() => this.post(event)).catch(() => undefined);
  }

  private enqueueAwait(fn: () => Promise<void>): Promise<void> {
    const job = this.queue.tail.then(fn);
    this.queue.tail = job.catch(() => undefined);

    return job;
  }
}

export function createPlanHandle(post: PlanPostFn, initialTitle?: string): InternalPlanHandle {
  return new PlanHandleImpl(post, initialTitle);
}

function nextStepId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
