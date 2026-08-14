# EventBridge Scheduler for long-delay jobs — operations

Job delays longer than the SQS per-message cap of 900s are created as one-shot
EventBridge schedules that deliver the job payload to the standard SQS queue at
fire time. Everything downstream of the queue is unchanged. Until the feature
flag is on, such delays keep going to BullMQ.

Nothing here has been applied to AWS. The infrastructure is expected to be
created by Terraform, and the live end-to-end validation still has to run
afterwards.

## 1. Infrastructure checklist

### Schedule groups

Five groups, one per defer reason, named `${prefix}-${reason}`:

```
${prefix}-delay
${prefix}-digest
${prefix}-throttle
${prefix}-snooze
${prefix}-schedule-extension
```

`${prefix}` is whatever `EVENTBRIDGE_SCHEDULER_GROUP_PREFIX` is set to. Groups
are never created lazily — a missing group makes every schedule for that reason
fail and fall back to BullMQ.

### Dead-letter queue

One SQS queue for failed fires. Required: the service refuses to use the
scheduler path at all unless `EVENTBRIDGE_SCHEDULER_DLQ_ARN` is set, because a
fire that fails without a DLQ is a job that silently never runs.

### Scheduler execution role

Assumed by EventBridge Scheduler when a schedule fires.

- Trust policy: principal `scheduler.amazonaws.com`, action `sts:AssumeRole`.
  Add `aws:SourceAccount` and `aws:SourceArn` conditions to avoid the confused
  deputy problem.
- Permissions: `sqs:SendMessage` on **both** the standard queue ARN and the
  DLQ ARN. Scheduler uses this same role to write to the DLQ.

### API and worker task roles

The services that call `CreateSchedule` / `DeleteSchedule` need:

- `scheduler:CreateSchedule` and `scheduler:DeleteSchedule`, scoped to
  `arn:aws:scheduler:${region}:${account}:schedule/${prefix}-*/*`.
- `iam:PassRole` on the scheduler execution role above. This is easy to miss
  and `CreateSchedule` fails without it, since the call passes `RoleArn` in the
  target.

### Quotas to confirm before rollout

- The account's `CreateSchedule` request-rate quota, against expected peak
  long-delay volume. Both this and the schedules-per-account ceiling are soft
  limits; look up the current values for the target region rather than assuming
  the defaults are sufficient.
- Schedules are deleted automatically after firing
  (`ActionAfterCompletion: DELETE`), so the steady-state count is roughly the
  number of jobs currently deferred beyond 900s, not a cumulative total.

## 2. Environment variables

Set on both the API and the worker.

| Variable | Required | Meaning |
| --- | --- | --- |
| `EVENTBRIDGE_SCHEDULER_GROUP_PREFIX` | yes | Prefix for the five schedule groups |
| `EVENTBRIDGE_SCHEDULER_ROLE_ARN` | yes | Scheduler execution role |
| `EVENTBRIDGE_SCHEDULER_DLQ_ARN` | yes | Dead-letter queue for failed fires |
| `EVENTBRIDGE_SCHEDULER_MAX_RETRY_ATTEMPTS` | no | Delivery retries before DLQ (default 10) |
| `EVENTBRIDGE_SCHEDULER_MAX_EVENT_AGE_SECONDS` | no | Delivery retry window (default 3600) |

All three required variables must be present or the scheduler path stays off
regardless of the feature flag. The target queue ARN is derived from
`SQS_QUEUE_URL_STANDARD`, so no separate variable is needed.

## 3. DLQ alarm

Any message on the scheduler DLQ is a job that will not run until someone
intervenes, so the alarm threshold is one message, not a rate:

- Metric: `ApproximateNumberOfMessagesVisible` on the scheduler DLQ
- Condition: `>= 1` for one evaluation period
- Treat missing data as not breaching

Page rather than email — the job is already late by the time it lands here.

## 4. Redrive runbook

**Confirm the message shape before the first bulk redrive.** The templated SQS
target sends `Target.Input` as the message body verbatim, so a DLQ message
should be the job JSON exactly as the queue expects it, and a plain SQS redrive
back to the standard queue should be enough. This has not been verified against
live AWS yet. During validation, deliberately fail one schedule and inspect the
resulting DLQ body:

- If the body is bare job JSON (`{"_id": "...", "_environmentId": "...", ...}`),
  the console's built-in "Start DLQ redrive" to the standard queue is correct.
- If the body is wrapped in an API-call envelope, each message has to be
  unwrapped to its inner payload before being re-enqueued. (This was the
  observed shape for the universal `aws-sdk:sqs:sendMessage` target during the
  spike; the templated target should not behave this way, which is exactly why
  it needs confirming.)

Two things that make redrive safe:

- Redriven messages execute immediately rather than at the original fire time,
  which is what you want — the job is already overdue.
- Cancellation is Mongo-driven. `RunJob` re-reads job state and calls
  `jobRepository.claimAsRunning()`, so redriving a job that was cancelled or
  already ran is a no-op rather than a duplicate send.

## 5. Flag rollout

Flag: `IS_EVENTBRIDGE_SCHEDULER_ENABLED` (boolean, defaults to false).

Prerequisites: Terraform applied, environment variables set on the API and
worker, both redeployed.

1. Enable for one internal organization.
2. Trigger a job past 900s for each defer reason: a delay step, a digest, a
   throttle, a snooze, and a quiet-hours schedule extension. Confirm each
   schedule lands in its own group and that the job executes at the expected
   time.
3. Watch during ramp: DLQ depth, `CreateSchedule` failures in the service logs
   (each one is a silent fall back to BullMQ, not an outage), and the BullMQ
   delayed count on the standard queue, which should stop growing.
4. Ramp by organization.

### Rollback

Flip the flag off. This is safe and non-destructive: schedules already created
still fire, still land on the same queue, and are still consumed normally,
because the consumer side never changed. Only *new* long delays revert to
BullMQ.

### Before downsizing MemoryDB

The BullMQ delayed set has to actually drain first, and the maximum defer
horizon is `SYSTEM_LIMITS.DEFER_DURATION_MS` (180 days). A job enqueued to
BullMQ the moment before cutover can therefore sit there for another six
months. Wait for the standard-topic delayed count to reach zero rather than
for the cutover date plus a margin.
