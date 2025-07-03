import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { JsonSchemaTypeEnum } from '@novu/dal';
import { LAYOUT_CONTENT_VARIABLE } from '@novu/shared';

import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import { buildSubscriberSchema } from '../../../shared/utils/create-schema';
import { LayoutVariablesSchemaCommand } from './layout-variables-schema.command';
import { CreateVariablesObjectCommand } from '../../../shared/usecases/create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../../../shared/usecases/create-variables-object/create-variables-object.usecase';

@Injectable()
export class LayoutVariablesSchemaUseCase {
  constructor(private readonly createVariablesObject: CreateVariablesObject) {}

  @InstrumentUsecase()
  async execute(command: LayoutVariablesSchemaCommand): Promise<JSONSchemaDto> {
    const { controlValues } = command;

    const { subscriber } = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        controlValues: Object.values(controlValues),
      })
    );

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        subscriber: buildSubscriberSchema(subscriber),
        [LAYOUT_CONTENT_VARIABLE]: {
          type: JsonSchemaTypeEnum.STRING,
        },
      },
      additionalProperties: false,
    };
  }
}
