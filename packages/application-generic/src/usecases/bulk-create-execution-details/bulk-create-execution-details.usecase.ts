import { InstrumentUsecase } from '../../instrumentation';
import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository, ExecutionDetailsEntity } from '@novu/dal';

import { BulkCreateExecutionDetailsCommand } from './bulk-create-execution-details.command';
import { mapExecutionDetailsCommandToEntity } from '../create-execution-details';

@Injectable()
export class BulkCreateExecutionDetails {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  @InstrumentUsecase()
  async execute(command: BulkCreateExecutionDetailsCommand) {
    const entities = [];
    command.details.forEach((detail) => {
      let entity = mapExecutionDetailsCommandToEntity(detail);

      entity = this.cleanFromNulls(entity);

      entities.push(entity);
    });
    // TODO: Which checks to do? If the notification and job belong to the environment and organization provided?

    await this.executionDetailsRepository.insertMany(entities);
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
