import { Injectable, NotFoundException } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

import { FindDeletedLayoutCommand } from './find-deleted-layout.command';

import { LayoutDto } from '../../dtos';
import { IEmailBlock, ITemplateVariable } from '../../types';

@Injectable()
export class FindDeletedLayoutUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: FindDeletedLayoutCommand): Promise<LayoutDto> {
    const layout = await this.layoutRepository.findDeleted(command.layoutId, command.environmentId);

    if (!layout) {
      throw new NotFoundException(
        `Layout deleted not found for id ${command.layoutId} in the environment ${command.environmentId}`
      );
    }

    return this.mapFromEntity(layout);
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      variables: this.mapVariablesFromEntity(layout.variables),
      isDeleted: layout.deleted,
    };
  }

  private mapVariablesFromEntity(variables?: ITemplateVariable[]): ITemplateVariable[] {
    if (!variables || variables.length === 0) {
      return [];
    }

    return variables.map((variable) => {
      const { name, type, defaultValue, required } = variable;

      return {
        name,
        type,
        defaultValue,
        required,
      };
    });
  }

  private mapContentFromEntity(blocks: IEmailBlock[]): IEmailBlock[] {
    return blocks.map((block) => {
      const { content, type, url } = block;

      return {
        content,
        type,
        ...(url && { url }),
      };
    });
  }
}
