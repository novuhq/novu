import { InstrumentUsecase } from '../../instrumentation';
import { Injectable } from '@nestjs/common';
import {
  ExecutionDetailsRepository,
  ExecutionDetailsEntity,
  DalException,
} from '@novu/dal';

import { BulkCreateExecutionDetailsCommand } from './bulk-create-execution-details.command';
import { mapExecutionDetailsCommandToEntity } from '../create-execution-details';
import { PlatformException } from '../../utils/exceptions';

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

    try {
      await this.executionDetailsRepository.insertMany(entities);
    } catch (e) {
      if (e instanceof DalException) {
        throw new PlatformException(e.message);
      }
      throw e;
    }
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
