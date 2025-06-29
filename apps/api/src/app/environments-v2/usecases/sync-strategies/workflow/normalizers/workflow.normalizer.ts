import { Injectable } from '@nestjs/common';
import { WorkflowResponseDto } from '../../../../../workflows-v2/dtos/workflow-response.dto';
import { IWorkflowNormalizer, INormalizedWorkflow, INormalizedStep } from '../types/workflow-sync.types';

@Injectable()
export class WorkflowNormalizer implements IWorkflowNormalizer {
  normalizeWorkflow(workflow: WorkflowResponseDto): INormalizedWorkflow {
    return {
      workflowId: workflow.workflowId,
      name: workflow.name,
      active: workflow.active ?? false,
      tags: workflow.tags || [],
      description: workflow.description,
      payloadSchema: workflow.payloadSchema,
      validatePayload: workflow.validatePayload,
      steps: this.normalizeSteps(workflow.steps || []),
      preferences: workflow.preferences,
    };
  }

  normalizeStep(step: any): INormalizedStep {
    return {
      stepId: step.stepId || step._templateId,
      name: step.name || '',
      type: step.template?.type || step.type,
      active: step.active,
      shouldStopOnFail: step.shouldStopOnFail,
      filters: step.filters,
      controlValues: step.controls?.values || step.controlValues || step.template?.content || {},
    };
  }

  private normalizeSteps(steps: any[]): INormalizedStep[] {
    return steps.map((step) => this.normalizeStep(step));
  }

  normalizeWorkflowForComparison(workflow: WorkflowResponseDto): INormalizedWorkflow {
    const normalized = this.normalizeWorkflow(workflow);

    return {
      ...normalized,
      steps: normalized.steps.map((step) => this.normalizeStepForComparison(step)),
    };
  }

  normalizeStepForComparison(step: INormalizedStep): INormalizedStep {
    return {
      stepId: step.stepId,
      name: step.name,
      type: step.type,
      active: step.active,
      shouldStopOnFail: step.shouldStopOnFail,
      filters: step.filters,
      controlValues: step.controlValues,
    };
  }
}
