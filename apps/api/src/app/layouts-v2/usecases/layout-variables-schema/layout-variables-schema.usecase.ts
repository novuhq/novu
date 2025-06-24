import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { JsonSchemaTypeEnum } from '@novu/dal';
import { LAYOUT_CONTENT_VARIABLE } from '@novu/shared';

import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import { buildSubscriberSchema } from '../../../shared/utils/create-schema';
import { LayoutVariablesSchemaCommand } from './layout-variables-schema.command';

@Injectable()
export class LayoutVariablesSchemaUseCase {
  @InstrumentUsecase()
  async execute(command: LayoutVariablesSchemaCommand): Promise<JSONSchemaDto> {
    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        // TODO: implement subscriber data schema
        subscriber: buildSubscriberSchema({}),
        [LAYOUT_CONTENT_VARIABLE]: {
          type: JsonSchemaTypeEnum.STRING,
        },
      },
      additionalProperties: false,
    };
  }
}
