# Which `JobsOptions` each queue backend honors

A job can reach the worker through three paths, and they do not preserve the
same options. BullMQ interprets every field; SQS and EventBridge Scheduler
only carry the payload plus a delivery time, so anything else is dropped at the
producer and has to be re-implemented on the consumer side.

`sqs-job-adapter.ts` hardcodes `opts: {}` when rebuilding a BullMQ-shaped job
from an SQS message, which is where the drop becomes observable.

| Option | BullMQ | SQS (`≤900s`) | Scheduler (`>900s`) |
| --- | --- | --- | --- |
| `delay` | delayed set | `DelaySeconds` | schedule fire time |
| `jobId` | dedup key | ignored, SQS mints its own message id | schedule name, so it stays the dedup key |
| `attempts` | honored | dropped | dropped |
| `backoff` | honored | dropped | dropped |
| `removeOnComplete` / `removeOnFail` | honored | not applicable | not applicable |

## What replaces `attempts` and `backoff`

Retries on both SQS paths are a property of the queue rather than the message.
`createSqsJobAdapter` maps the SQS receive count onto `job.attemptsMade`, so the
worker still compares against the same `DEFAULT_ATTEMPTS` ceiling; redelivery
cadence becomes the consumer-wide visibility timeout instead of a per-job
backoff curve, and `RedrivePolicy.maxReceiveCount` caps total deliveries. The
handler comment in `apps/worker/src/app/workflow/services/standard.worker.ts`
describes the full mechanism.

Two consequences worth knowing:

- The `WEBHOOK_FILTER_BACKOFF` strategy that `add-job.usecase.ts` attaches to
  webhook-filter steps does not run. Those steps retry on the flat visibility
  timeout instead of the strategy's computed interval.
- The exponential backoff that `snooze-notification.usecase.ts` sets is
  likewise inert.

Both were already true of the ≤900s SQS path before EventBridge Scheduler
existed; routing long delays through Scheduler does not make it worse, since a
Scheduler fire lands on the same queue and inherits the same consumer.

## Scheduler-only differences

- **No `MessageGroupId`.** The direct SQS path tags each message with the
  organization id for fair-queue attribution. EventBridge Scheduler's templated
  SQS target rejects `MessageGroupId` for non-FIFO queues, so scheduled fires
  arrive without it.
- **Retries are on the fire, not the job.** `RetryPolicy` and
  `DeadLetterConfig` on the schedule cover failures to *deliver* the message to
  SQS. Once the message lands, normal queue retry semantics take over.
- **Cancellation stays Mongo-driven.** Schedules are not deleted when a job is
  cancelled (except snooze). A stale fire is a safe no-op because `RunJob`
  re-reads state through `delayedEventIsCanceled()` and
  `jobRepository.claimAsRunning()`.
