import { Injectable } from '@nestjs/common';
import {
  JobEntity,
  MessageTemplateEntity,
  MessageTemplateRepository,
  NotificationStepData,
  NotificationStepEntity,
  NotificationTemplateEntity,
  StepFilter,
} from '@novu/dal';
import { IWorkflowStepMetadata, STEP_TYPE_TO_CHANNEL_TYPE, StepTypeEnum } from '@novu/shared';
import { PinoLogger } from '../logging';

/**
 * Lean projection of a workflow step persisted on a job when
 * `IS_JOB_STEP_DEDUP_ENABLED` is on: the ids/filters/metadata the worker reads
 * directly, plus a `{ _id, type }` template stub. Produced by {@link toLeanStep}
 * and rehydrated by {@link StepTemplateHydrationService}, so producer, consumer,
 * and shape live in one place.
 */
export type LeanNotificationStep = Pick<
  NotificationStepEntity,
  '_id' | 'uuid' | 'stepId' | 'name' | '_templateId' | '_parentId' | 'active' | 'shouldStopOnFail'
> & {
  filters?: StepFilter[];
  metadata?: IWorkflowStepMetadata;
  replyCallback?: { active: boolean; url: string };
  controlVariables?: Record<string, unknown>;
  bridgeUrl?: string;
  template: { _id?: string; type?: StepTypeEnum };
  variants?: LeanNotificationStep[];
};

export enum StepTemplateHydrationStatus {
  /** Template was resolved and attached to the job step in place. */
  HYDRATED = 'hydrated',
  /** Nothing to do: full snapshot, bridgeUrl/stateless job, or non-rendering lean step. */
  SKIPPED = 'skipped',
  /** Lean channel step whose template could not be resolved anywhere. */
  UNRESOLVED = 'unresolved',
}

/**
 * Projects a step to the fields the worker reads directly from the job,
 * replacing the populated message template with a `{ _id, type }` stub. Variants
 * (which only exist on the top-level step) are projected by the caller.
 */
export function toLeanStep(step: NotificationStepData): LeanNotificationStep {
  return {
    _id: step._id,
    uuid: step.uuid,
    stepId: step.stepId,
    name: step.name,
    _templateId: step._templateId,
    _parentId: step._parentId,
    active: step.active,
    shouldStopOnFail: step.shouldStopOnFail,
    filters: step.filters,
    metadata: step.metadata,
    replyCallback: step.replyCallback,
    controlVariables: step.controlVariables,
    template: {
      _id: step.template?._id ?? step._templateId,
      type: step.template?.type,
    },
  };
}

/**
 * A hydrated/full template always carries `_environmentId`; the lean stub is
 * only `{ _id, type }`. Stateless code-first stubs (`{ type }`) are also lean by
 * this test but are filtered out by the caller via a missing `_templateId`.
 */
function isLeanStepTemplate(step?: NotificationStepEntity): boolean {
  const template = step?.template as MessageTemplateEntity | undefined;
  if (!template) {
    return false;
  }

  return !template._environmentId;
}

/**
 * Owns the step-template side of the job-step-dedup model: restoring the full
 * message template onto a job whose `step.template` is a lean `{ _id, type }`
 * stub. Sibling of {@link NotificationPayloadService}, which owns the
 * notification-backed payload side of the same dedup model.
 */
@Injectable()
export class StepTemplateHydrationService {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Restores `job.step.template` in place (never written back to Mongo) so
   * downstream rendering behaves identically to a full snapshot. No-op for full
   * snapshots (old / flag-off jobs) and bridgeUrl jobs (discover stub + optional
   * synced `_templateId`). Returns {@link StepTemplateHydrationStatus.UNRESOLVED}
   * for a lean channel step whose template is gone everywhere, leaving failure
   * handling to the caller.
   */
  async hydrateJobStep(job: JobEntity, workflow?: NotificationTemplateEntity): Promise<StepTemplateHydrationStatus> {
    const { step } = job;
    if (!isLeanStepTemplate(step)) {
      return StepTemplateHydrationStatus.SKIPPED;
    }
    // Bridge-URL jobs (stateless discover, or a synced workflow triggered with an
    // override bridgeUrl) use the bridge as the source of truth for step content.
    // Their step.template is only a `{ type }` stub from discover — never hydrate
    // from Mongo, even when a synced `_templateId` is present on the job.
    if (!job._templateId || step.bridgeUrl) {
      return StepTemplateHydrationStatus.SKIPPED;
    }

    const expectedType = step.template?.type;
    const resolved = await this.resolveStepTemplate(job, workflow, expectedType);
    if (resolved) {
      step.template = resolved;

      return StepTemplateHydrationStatus.HYDRATED;
    }

    // Only channel steps render from a message template; delay/digest/throttle/
    // trigger/http/custom never read it, so a lean stub is fine for them.
    if (!expectedType || !STEP_TYPE_TO_CHANNEL_TYPE.has(expectedType)) {
      return StepTemplateHydrationStatus.SKIPPED;
    }

    return StepTemplateHydrationStatus.UNRESOLVED;
  }

  private async resolveStepTemplate(
    job: JobEntity,
    workflow: NotificationTemplateEntity | undefined,
    expectedType?: StepTypeEnum
  ): Promise<MessageTemplateEntity | undefined> {
    const { step } = job;

    // 1. Match the already-loaded, populated live workflow step (in-memory).
    const workflowStep = workflow?.steps?.find(
      (candidate) => (!!step._id && candidate._id === step._id) || (!!step.uuid && candidate.uuid === step.uuid)
    );
    if (this.isUsableTemplate(workflowStep?.template, expectedType)) {
      return workflowStep?.template;
    }

    if (!step._templateId) {
      return undefined;
    }

    // 2. Direct lookup (step removed/reordered in the workflow after scheduling).
    const messageTemplate = await this.messageTemplateRepository.findOne({
      _id: step._templateId,
      _environmentId: job._environmentId,
    });
    if (this.isUsableTemplate(messageTemplate, expectedType)) {
      return messageTemplate ?? undefined;
    }

    // 3. Soft-deleted template (step deleted while the job was delayed): send the
    // last-known content, matching the pre-dedup snapshot behavior.
    const deletedTemplate = await this.messageTemplateRepository.findDeleted({
      _id: step._templateId,
      _environmentId: job._environmentId,
    });
    if (this.isUsableTemplate(deletedTemplate, expectedType)) {
      this.logger.warn(
        { jobId: job._id, messageTemplateId: step._templateId, stepId: step.stepId },
        'Hydrated job step from a soft-deleted message template'
      );

      return deletedTemplate ?? undefined;
    }

    return undefined;
  }

  /** Rejects a template whose channel changed after the job was scheduled. */
  private isUsableTemplate(
    template: MessageTemplateEntity | undefined | null,
    expectedType?: StepTypeEnum
  ): template is MessageTemplateEntity {
    if (!template) {
      return false;
    }

    return !expectedType || template.type === expectedType;
  }
}
