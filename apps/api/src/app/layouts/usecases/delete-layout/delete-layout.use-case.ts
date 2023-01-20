import { ConflictException, Injectable } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

import { DeleteLayoutCommand } from './delete-layout.command';

import { CheckLayoutIsUsedCommand, CheckLayoutIsUsedUseCase } from '../check-layout-is-used';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private checkLayoutIsUsed: CheckLayoutIsUsedUseCase,
    private layoutRepository: LayoutRepository
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

    await this.layoutRepository.deleteLayout(command.layoutId, layout._environmentId, layout._organizationId);
  }
}
