import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { JobStatusEnum } from '@novu/shared';
import { PreviewPayloadDto } from '../../../dtos';
import { FrameworkPreviousStepsOutputState } from '../../../../bridge/usecases/preview-step/preview-step.command';

@Injectable()
export class PreviewPayloadProcessorService {
  /**
   * Removes computed digest properties (eventCount, events.length) that shouldn't be exposed
   * in the preview payload schema to prevent user confusion.
   * Also reorders keys to have "payload" first, followed by "subscriber", then the rest.
   */
  cleanPreviewExamplePayload(payloadExample: Record<string, unknown>): Record<string, unknown> {
    const cleanedPayloadExample = _.cloneDeep(payloadExample);

    if (cleanedPayloadExample.steps && typeof cleanedPayloadExample.steps === 'object') {
      const steps = cleanedPayloadExample.steps as Record<string, unknown>;

      Object.keys(steps)
        .filter((stepId) => typeof steps[stepId] === 'object')
        .forEach((stepId) => {
          const step = steps[stepId] as Record<string, unknown>;

          delete step.eventCount;

          if (step.events && typeof step.events === 'object' && !Array.isArray(step.events)) {
            delete (step.events as Record<string, unknown>).length;
          }
        });
    }

    // Reorder keys: payload first, subscriber second, then the rest
    const reorderedPayload: Record<string, unknown> = {};

    if (cleanedPayloadExample.payload !== undefined) {
      reorderedPayload.payload = cleanedPayloadExample.payload;
    }

    if (cleanedPayloadExample.subscriber !== undefined) {
      reorderedPayload.subscriber = cleanedPayloadExample.subscriber;
    }

    // Add remaining keys
    Object.keys(cleanedPayloadExample).forEach((key) => {
      if (key !== 'payload' && key !== 'subscriber') {
        reorderedPayload[key] = cleanedPayloadExample[key];
      }
    });

    return reorderedPayload;
  }

  /**
   * Calculates eventCount from events array length for digest steps, ensuring bridge
   * receives accurate event counts for processing.
   */
  enhanceEventCountValue(payloadExample: PreviewPayloadDto): Record<string, Record<string, unknown>> {
    const preparedPayload = _.cloneDeep(payloadExample);

    if (preparedPayload.steps && typeof preparedPayload.steps === 'object') {
      const steps = preparedPayload.steps as Record<string, unknown>;

      Object.keys(steps)
        .filter((stepId) => typeof steps[stepId] === 'object')
        .forEach((stepId) => {
          const step = steps[stepId] as Record<string, unknown>;

          step.eventCount = Array.isArray(step.events) ? step.events.length : 0;
        });
    }

    return preparedPayload;
  }

  buildState(steps: Record<string, unknown> | undefined): FrameworkPreviousStepsOutputState[] {
    const outputArray: FrameworkPreviousStepsOutputState[] = [];
    for (const [stepId, value] of Object.entries(steps || {})) {
      outputArray.push({
        stepId,
        outputs: value as Record<string, unknown>,
        state: {
          status: JobStatusEnum.COMPLETED,
        },
      });
    }

    return outputArray;
  }
}
