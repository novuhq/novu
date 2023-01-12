import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

import { DeleteLayoutCommand } from './delete-layout.command';

import { LayoutDto } from '../../dtos';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(private getLayoutUseCase: GetLayoutUseCase, private layoutRepository: LayoutRepository) {}

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const getLayoutCommand = GetLayoutCommand.create({
      ...command,
    });

    const layout = await this.getLayoutUseCase.execute(getLayoutCommand);

    const result = await this.layoutRepository.deleteLayout(
      LayoutRepository.convertStringToObjectId(command.layoutId),
      LayoutRepository.convertStringToObjectId(layout._environmentId),
      LayoutRepository.convertStringToObjectId(layout._organizationId)
    );
    console.log({ result });
  }
}
