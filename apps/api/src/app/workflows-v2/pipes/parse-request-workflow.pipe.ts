import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { isStepCreateBody, isStepUpdateBody, UpsertStepBody, UpsertWorkflowBody, UpdateStepBody } from '@novu/shared';

import { parseSlugId } from './parse-slug-Id.pipe';

@Injectable()
export class ParseRequestWorkflowPipe implements PipeTransform<UpsertWorkflowBody> {
  transform(value: UpsertWorkflowBody, metadata: ArgumentMetadata) {
    if (!value) {
      return value;
    }

    return decodeSteps(value);
  }
}

function decodeSteps(value: UpsertWorkflowBody) {
  const steps = value.steps.map((step: UpsertStepBody) => {
    if (isStepCreateBody(step)) {
      return step;
    }

    if (isStepUpdateBody(step)) {
      const { id, ...rest } = step as UpdateStepBody;

      return {
        ...rest,
        _id: parseSlugId(id),
      };
    }

    return step;
  });

  return {
    ...value,
    steps,
  };
}
