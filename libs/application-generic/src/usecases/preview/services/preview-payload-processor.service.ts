import { Injectable } from '@nestjs/common';
import { JobStatusEnum } from '@novu/shared';
import _ from 'lodash';
import { PreviewPayloadDto } from '../../../dtos/workflow/preview-payload.dto';
import { FrameworkPreviousStepsOutputState } from '../preview.types';

@Injectable()
export class PreviewPayloadProcessorService {
  /**
   * Reorders keys to have "payload" first, followed by "subscriber", then the rest.
   */
  cleanPreviewExamplePayload(payloadExample: Record<string, unknown>): Record<string, unknown> {
    const cleanedPayloadExample = _.cloneDeep(payloadExample);

    const reorderedPayload: Record<string, unknown> = {};

    if (cleanedPayloadExample.payload !== undefined) {
      reorderedPayload.payload = cleanedPayloadExample.payload;
    }

    if (cleanedPayloadExample.subscriber !== undefined) {
      reorderedPayload.subscriber = cleanedPayloadExample.subscriber;
    }

    if (cleanedPayloadExample.context !== undefined) {
      reorderedPayload.context = cleanedPayloadExample.context;
    }

    // Add remaining keys
    Object.keys(cleanedPayloadExample).forEach((key) => {
      if (key !== 'payload' && key !== 'subscriber' && key !== 'context') {
        reorderedPayload[key] = cleanedPayloadExample[key];
      }
    });

    return reorderedPayload as Record<string, unknown>;
  }

  /**
   * Calculates eventCount from events array length for digest steps only, ensuring bridge
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

          // Add eventCount for any step that has an events array (digest steps)
          if (Array.isArray(step.events)) {
            step.eventCount = step.events.length;
          }
        });
    }

    return preparedPayload as Record<string, Record<string, unknown>>;
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
