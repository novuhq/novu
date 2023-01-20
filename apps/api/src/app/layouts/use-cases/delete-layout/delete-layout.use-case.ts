import { Injectable } from '@nestjs/common';
import { LayoutRepository } from '@novu/dal';

import { DeleteLayoutCommand } from './delete-layout.command';

import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(private getLayoutUseCase: GetLayoutUseCase, private layoutRepository: LayoutRepository) {}

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const getLayoutCommand = GetLayoutCommand.create({
      ...command,
    });

    const layout = await this.getLayoutUseCase.execute(getLayoutCommand);

    await this.layoutRepository.deleteLayout(command.layoutId, layout._environmentId, layout._organizationId);
  }
}
