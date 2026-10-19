import { BadRequestException, Injectable } from '@nestjs/common';
import { ControlValuesRepository, MessageTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { InstrumentUsecase } from '../../instrumentation';
import { isStepResolverSupportedType } from '../../utils/digest';
import { stepTypeToControlSchema } from '../../utils/step-type-to-control.mapper';
import { DisconnectStepResolverCommand } from './disconnect-step-resolver.command';

@Injectable()
export class DisconnectStepResolverUsecase {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private controlValuesRepository: ControlValuesRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DisconnectStepResolverCommand): Promise<void> {
    if (!isStepResolverSupportedType(command.stepType)) {
      throw new BadRequestException(`Step type '${command.stepType}' does not support step resolvers.`);
    }

    const controlSchemas = stepTypeToControlSchema[command.stepType];

    await this.messageTemplateRepository.update(
      { _id: command.stepInternalId, _environmentId: command.user.environmentId },
      {
        $unset: { stepResolverHash: 1 },
        $set: {
          'controls.schema': controlSchemas?.schema,
          'controls.uiSchema': controlSchemas?.uiSchema,
        },
      }
    );

    // Instead of resetting control values to their defaults, we simply remove them.
    // This allows new control values in the correct shape to be generated automatically as users input content.
    await this.controlValuesRepository.deleteMany({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _stepId: command.stepInternalId,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });
  }
}
