import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';

import { UserSessionData } from '@novu/shared';
import { ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { StepType } from '@novu/framework';

import { GetStepDefaultSchemaCommand } from './usecases/get-default-schema/get-default-schema.command';
import { StepOutputSchema } from './types';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { GetStepDefaultSchema } from './usecases/get-default-schema/get-default-schema.usecase';

@Controller('/step-schemas')
@UserAuthentication()
@UseInterceptors(ClassSerializerInterceptor)
export class StepSchemasController {
  constructor(private getStepDefaultSchemaUsecase: GetStepDefaultSchema) {}

  @Get('/defaults/:stepType')
  @ExternalApiAccessible()
  async getStepSchema(
    @UserSession() user: UserSessionData,
    @Param('stepType') stepType: StepType
  ): Promise<StepOutputSchema> {
    return await this.getStepDefaultSchemaUsecase.execute(
      GetStepDefaultSchemaCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        stepType,
      })
    );
  }
}
