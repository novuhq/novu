import { Injectable } from '@nestjs/common';
import { emailControlSchema, emailUiSchema, InstrumentUsecase } from '@novu/application-generic';
import { MessageTemplateRepository } from '@novu/dal';
import { DisconnectStepResolverCommand } from './disconnect-step-resolver.command';

@Injectable()
export class DisconnectStepResolverUsecase {
  constructor(private messageTemplateRepository: MessageTemplateRepository) {}

  @InstrumentUsecase()
  async execute(command: DisconnectStepResolverCommand): Promise<void> {
    await this.messageTemplateRepository.update(
      { _id: command.stepInternalId, _environmentId: command.user.environmentId },
      {
        $set: {
          stepResolverHash: null,
          'controls.schema': emailControlSchema,
          'controls.uiSchema': emailUiSchema,
        },
      }
    );
  }
}
