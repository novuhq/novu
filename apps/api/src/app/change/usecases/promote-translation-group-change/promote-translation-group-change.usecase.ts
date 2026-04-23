import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { ChangeRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { ApplyChangeCommand } from '../apply-change/apply-change.command';
import { applyChangeForwardRef } from '../apply-change/apply-change.forward-ref';
import type { ApplyChange } from '../apply-change/apply-change.usecase';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';

@Injectable()
export class PromoteTranslationGroupChange {
  constructor(
    private moduleRef: ModuleRef,
    @Inject(applyChangeForwardRef) private applyChange: ApplyChange,
    private changeRepository: ChangeRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: PromoteTypeChangeCommand) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-translation')?.PromoteTranslationGroupChange) {
          throw new BadRequestException('Translation module is not loaded');
        }
        const usecase = this.moduleRef.get(require('@novu/ee-translation')?.PromoteTranslationGroupChange, {
          strict: false,
        });
        await usecase.execute(command, this.applyDefaultTranslationChange.bind(this));
      }
    } catch (e) {
      this.logger.error({ err: e }, `Unexpected error while importing enterprise modules`);
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
