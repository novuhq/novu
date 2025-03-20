import { DelayTypeEnum, StepTypeEnum } from '@novu/shared';
import { BadRequestException } from '@nestjs/common';
import { VerifyPayloadService, InstrumentUsecase } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayloadCommand } from './verify-payload.command';

const ISO_DATE_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

export class VerifyPayload {
  @InstrumentUsecase()
  execute(command: VerifyPayloadCommand): Record<string, unknown> {
    const verifyPayloadService = new VerifyPayloadService();

    const invalidKeys: string[] = [];
    let defaultPayload;

    for (const step of command.template.steps) {
      invalidKeys.push(...verifyPayloadService.checkRequired(step.template?.variables || [], command.payload));
      if (step.template?.type === StepTypeEnum.DELAY && step.metadata?.type === DelayTypeEnum.SCHEDULED) {
        if (!step.metadata.delayPath) {
          throw new BadRequestException('Delay path is required for scheduled delay');
        }

        const invalidKey = this.checkRequiredDelayPath(step.metadata.delayPath, command.payload);
        if (invalidKey) {
          invalidKeys.push(invalidKey);
        }
      }
    }

    if (invalidKeys.length) {
      // TODO: create execution detail for missing keys in payload
      throw new ApiException(`payload is missing required key(s) and type(s): ${invalidKeys.join(', ')}`);
    }

    for (const step of command.template.steps) {
      defaultPayload = verifyPayloadService.fillDefaults(step.template?.variables || []);
    }

    // TODO: create execution detail for payload created
    return defaultPayload;
  }

  private checkRequiredDelayPath(delayPath: string, payload: Record<string, unknown>): string | undefined {
    if (!delayPath) {
      return 'Missing delay path';
    }

    const delayDate = (payload[delayPath] as string) || '';
    const isoDate = delayDate.match(ISO_DATE_REGEX);
    if (!isoDate) {
      return `${delayPath} (ISO Date)`;
    }
  }
}
