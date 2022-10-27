import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository } from '@novu/dal';
import {
  CreateExecutionDetailsResponseDto,
  mapExecutionDetailsCommandToEntity,
} from '../../dtos/execution-details.dto';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';

@Injectable()
export class CreateExecutionDetails {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(command: CreateExecutionDetailsCommand): Promise<CreateExecutionDetailsResponseDto> {
    // TODO: Which checks to do? If the notification and job belong to the environment and organization provided?
    const entity = mapExecutionDetailsCommandToEntity(command);
    const { _id, createdAt } = await this.executionDetailsRepository.create(entity);

    /**
     * Response for a HTTP 201
     * TODO: Provide more data for a HTTP 200. Discuss which one choose.
     */
    return {
      id: _id,
      createdAt,
    };
  }
}
