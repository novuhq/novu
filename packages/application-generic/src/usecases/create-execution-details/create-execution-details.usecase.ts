import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository, ExecutionDetailsEntity } from '@novu/dal';
import { ExecutionDetailsStatusEnum } from '@novu/shared';

import {
  CreateExecutionDetailsResponseDto,
  mapExecutionDetailsCommandToEntity,
} from './dtos/execution-details.dto';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';

@Injectable()
export class CreateExecutionDetails {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(
    command: CreateExecutionDetailsCommand
  ): Promise<CreateExecutionDetailsResponseDto> {
    // TODO: Which checks to do? If the notification and job belong to the environment and organization provided?
    let entity = mapExecutionDetailsCommandToEntity(command);

    entity = this.cleanFromNulls(entity);

    const { _id, createdAt } = await this.executionDetailsRepository.create(
      entity,
      { writeConcern: 1 }
    );

    if (command.status === ExecutionDetailsStatusEnum.FAILED) {
      throw new Error(command.detail);
    }

    /**
     * Response for a HTTP 201
     * TODO: Provide more data for a HTTP 200. Discuss which one choose.
     */
    return {
      id: _id,
      createdAt,
    };
  }

  private cleanFromNulls(
    entity: Omit<ExecutionDetailsEntity, 'createdAt' | '_id'>
  ): Omit<ExecutionDetailsEntity, 'createdAt' | '_id'> {
    const cleanEntity = Object.assign({}, entity);

    if (cleanEntity.raw === null) {
      delete cleanEntity.raw;
    }

    return cleanEntity;
  }
}
