import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';

import { UserSessionData } from '@novu/shared';
import { ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { StepType } from '@novu/framework';

import { GetControlSchemaCommand } from './usecases/get-control-schema/get-control-schema.command';
import { GetControlSchema } from './usecases/get-control-schema/get-control-schema.usecase';
import { StepOutputSchema } from './types';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller('/controls')
@UserAuthentication()
@UseInterceptors(ClassSerializerInterceptor)
export class ControlsController {
  constructor(private getControlSchemaUsecase: GetControlSchema) {}

  @Get('/:stepType/schema')
  @ExternalApiAccessible()
  async getControlSchema(
    @UserSession() user: UserSessionData,
    @Param('stepType') stepType: StepType
  ): Promise<StepOutputSchema> {
    return await this.getControlSchemaUsecase.execute(
      GetControlSchemaCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        stepType,
      })
    );
  }
}
