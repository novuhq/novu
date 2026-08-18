## 📌 Summary
Fixes #12373

Fixes a bug where a digest job would merge with itself when the digest step is re-executed (e.g. on SQS retry or transient network errors), silently dropping batched notifications.

---

## 🔍 Root Cause Analysis
In `libs/dal/src/repositories/job/job.repository.ts`, `getExistingDelayedJobWithTheSameDigestValue` searched for a `DELAYED` digest job with matching template, environment, and subscriber IDs, but did not exclude the job currently being processed (`_id: { $ne: job._id }`).

When a digest master job was previously marked `DELAYED` and then re-evaluated during a retry/redelivery, `findOne` returned the same job itself. Consequently, the worker treated the job as merged into an existing digest (`digestResult: MERGED` with `activeDigestId === job._id`), marking the master and child jobs as `MERGED` and leaving the batch notification undelivered.

---

## 🛠️ Proposed Solution
- Added `_id: { $ne: this.convertStringToObjectId(job._id) }` to the query in `getExistingDelayedJobWithTheSameDigestValue`.
- Created unit tests in `libs/dal/src/repositories/job/job.repository.spec.ts` verifying that `findOne` excludes the job being processed.
