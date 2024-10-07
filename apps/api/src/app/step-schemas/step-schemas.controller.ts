import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';

import { UserSessionData } from '@novu/shared';
import { ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { StepType } from '@novu/framework';

import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { GetStepSchemaCommand } from './usecases/get-step-schema/get-step-schema.command';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { GetStepSchema } from './usecases/get-step-schema/get-step-schema.usecase';
import { SchemaTypeDto } from './dtos/schema-type.dto';

@Controller('/step-schemas')
@UserAuthentication()
@UseInterceptors(ClassSerializerInterceptor)
export class StepSchemasController {
  constructor(private getStepDefaultSchemaUsecase: GetStepSchema) {}

  @Get('/:stepType')
  @ApiOperation({
    summary: 'Get step schema',
    description: 'Get the schema for a step type',
  })
  @ApiParam({
    name: 'stepType',
    type: String,
    description: 'The type of step to get the schema for.',
  })
  @ExternalApiAccessible()
  async getStepSchema(
    @UserSession() user: UserSessionData,
    @Param('stepType') stepType: StepType
  ): Promise<SchemaTypeDto> {
    const schema = await this.getStepDefaultSchemaUsecase.execute(
      GetStepSchemaCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        stepType,
      })
    );

    return { schema };
  }
}
