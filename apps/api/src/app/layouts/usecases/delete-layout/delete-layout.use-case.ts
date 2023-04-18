import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { LayoutRepository } from '@novu/dal';
import { AnalyticsService, GetLayoutCommand, GetLayoutUseCase } from '@novu/application-generic';

import { DeleteLayoutCommand } from './delete-layout.command';

import { CheckLayoutIsUsedCommand, CheckLayoutIsUsedUseCase } from '../check-layout-is-used';
import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private checkLayoutIsUsed: CheckLayoutIsUsedUseCase,
    private createLayoutChange: CreateLayoutChangeUseCase,
    private layoutRepository: LayoutRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const getLayoutCommand = GetLayoutCommand.create({
      ...command,
    });

    const layout = await this.getLayoutUseCase.execute(getLayoutCommand);

    const isUsed = await this.checkLayoutIsUsed.execute(
      CheckLayoutIsUsedCommand.create({
        environmentId: command.environmentId,
        layoutId: command.layoutId,
        organizationId: command.organizationId,
      })
    );

    if (isUsed) {
      throw new ConflictException(`Layout with id ${command.layoutId} is being used so it can not be deleted`);
    }

    if (layout.isDefault) {
      throw new ConflictException(
        `Layout with id ${command.layoutId} is being used as your default layout, so it can not be deleted`
      );
    }

    await this.layoutRepository.deleteLayout(command.layoutId, layout._environmentId, layout._organizationId);

    await this.createChange(command);

    this.analyticsService.track('[Layout] - Delete', command.userId, {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      layoutId: command.layoutId,
    });
  }

  private async createChange(command: DeleteLayoutCommand): Promise<void> {
    const createLayoutChangeCommand = CreateLayoutChangeCommand.create({
      environmentId: command.environmentId,
      layoutId: command.layoutId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const isDeleteChange = true;
    await this.createLayoutChange.execute(createLayoutChangeCommand, isDeleteChange);
  }
}
