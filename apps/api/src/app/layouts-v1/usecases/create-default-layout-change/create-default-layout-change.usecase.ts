import { Injectable } from '@nestjs/common';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';
import { ChangeRepository, LayoutEntity, LayoutRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { LayoutDto } from '../../dtos';
import { FindDeletedLayoutCommand, FindDeletedLayoutUseCase } from '../find-deleted-layout';
import { CreateDefaultLayoutChangeCommand } from './create-default-layout-change.command';

type GetChangeId = {
  environmentId: string;
  layoutId: string;
};

@Injectable()
export class CreateDefaultLayoutChangeUseCase {
  constructor(
    private createChange: CreateChange,
    private findDeletedLayout: FindDeletedLayoutUseCase,
    private layoutRepository: LayoutRepository,
    private changeRepository: ChangeRepository
  ) {}

  async execute(command: CreateDefaultLayoutChangeCommand): Promise<void> {
    let item: LayoutEntity | LayoutDto | null = await this.layoutRepository.findOne({
      _id: command.layoutId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    const changeId = command.changeId || (await this.getChangeId(command));

    if (!item) {
      item = await this.findDeletedLayout.execute(FindDeletedLayoutCommand.create(command));
    }

    if (item) {
      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          type: ChangeEntityTypeEnum.DEFAULT_LAYOUT,
          parentChangeId: command.parentChangeId,
          changeId,
          item,
        })
      );
    }
  }

  private async getChangeId(command: GetChangeId) {
    return await this.changeRepository.getChangeId(
      command.environmentId,
      ChangeEntityTypeEnum.DEFAULT_LAYOUT,
      command.layoutId
    );
  }
}
