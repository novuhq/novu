import { Injectable } from '@nestjs/common';
import { CreateChange, CreateChangeCommand, LayoutDtoV0 } from '@novu/application-generic';
import { ChangeRepository, ClientSession, LayoutEntity, LayoutRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
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

  async execute(command: CreateDefaultLayoutChangeCommand, session?: ClientSession | null): Promise<void> {
    let item: LayoutEntity | LayoutDtoV0 | null = await this.layoutRepository.findOne(
      {
        _id: command.layoutId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      undefined,
      { session }
    );

    const changeId = command.changeId || (await this.getChangeId(command, session));

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
        }),
        session
      );
    }
  }

  private async getChangeId(command: GetChangeId, session?: ClientSession | null) {
    return await this.changeRepository.getChangeId(
      command.environmentId,
      ChangeEntityTypeEnum.DEFAULT_LAYOUT,
      command.layoutId,
      session
    );
  }
}
