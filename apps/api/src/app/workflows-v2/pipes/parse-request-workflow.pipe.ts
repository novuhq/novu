import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { isStepCreateBody, isStepUpdateBody, UpsertStepBody, UpsertWorkflowBody, UpdateStepBody } from '@novu/shared';

import { parseSlugId } from './parse-slug-Id.pipe';

/**
 * @deprecated This pipe is currently not needed and will be refactored
 * once support for step requests in the API "v2/workflows/:id/steps/:id" is added.
 */
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
      const { _id, ...rest } = step as UpdateStepBody;

      return {
        ...rest,
        _id: parseSlugId(_id),
      };
    }

    return step;
  });

  return {
    ...value,
    steps,
  };
}
