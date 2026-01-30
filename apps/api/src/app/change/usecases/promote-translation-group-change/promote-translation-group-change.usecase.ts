import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChangeRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { ApplyChange, ApplyChangeCommand } from '../apply-change';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';

// TODO: Implement PromoteTranslationGroupChange usecase in @novu/translation package
// This usecase handles promoting translation group changes between environments
// It needs to be integrated with the change management system

@Injectable()
export class PromoteTranslationGroupChange {
  constructor(
    @Inject(forwardRef(() => ApplyChange)) private applyChange: ApplyChange,
    private changeRepository: ChangeRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: PromoteTypeChangeCommand) {
    // TODO: Implement translation group change promotion logic
    // For now, this is a placeholder that logs the attempt
    try {
      this.logger.debug(`Promoting translation group change for command`);
      // Placeholder for future implementation
    } catch (e) {
      this.logger.error({ err: e }, `Error promoting translation group change`);
    }
  }

  private async applyDefaultTranslationChange(command: PromoteTypeChangeCommand, translationId: string) {
    const changes = await this.changeRepository.getEntityChanges(
      command.organizationId,
      ChangeEntityTypeEnum.TRANSLATION,
      translationId
    );

    for (const change of changes) {
      await this.applyChange.execute(
        ApplyChangeCommand.create({
          changeId: change._id,
          environmentId: change._environmentId,
          organizationId: change._organizationId,
          userId: command.userId,
        })
      );
    }
  }
}
