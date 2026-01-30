import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChangeRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { ApplyChange, ApplyChangeCommand } from '../apply-change';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';

// TODO: Implement PromoteTranslationChange usecase in @novu/translation package
// This usecase handles promoting translation changes between environments
// It needs to be integrated with the change management system

@Injectable()
export class PromoteTranslationChange {
  constructor(
    @Inject(forwardRef(() => ApplyChange)) private applyChange: ApplyChange,
    private changeRepository: ChangeRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: PromoteTypeChangeCommand) {
    // TODO: Implement translation change promotion logic
    // For now, we simply apply group changes directly
    try {
      await this.applyGroupChange(command);
    } catch (e) {
      this.logger.error({ err: e }, `Error promoting translation change`);
    }
  }

  private async applyGroupChange(command: PromoteTypeChangeCommand) {
    const newItem = command.item as {
      _groupId: string;
    };

    const changes = await this.changeRepository.getEntityChanges(
      command.organizationId,
      ChangeEntityTypeEnum.TRANSLATION_GROUP,
      newItem._groupId
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
