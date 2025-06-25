import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { JsonSchemaTypeEnum } from '@novu/dal';

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
      },
      additionalProperties: false,
    };
  }
}
