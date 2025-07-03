import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository, ExecutionDetailsEntity } from '@novu/dal';
import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { TraceLogRepository } from '../../services/analytic-logs/trace-log';

import { CreateExecutionDetailsResponseDto, mapExecutionDetailsCommandToEntity } from './dtos/execution-details.dto';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { LogRepository } from '../../services';

@Injectable()
export class CreateExecutionDetails {
  constructor(
    private executionDetailsRepository: ExecutionDetailsRepository,
    private traceLogRepository: TraceLogRepository
  ) {}

  async execute(command: CreateExecutionDetailsCommand): Promise<CreateExecutionDetailsResponseDto> {
    let entity = mapExecutionDetailsCommandToEntity(command);

    entity = this.cleanFromNulls(entity);

    const { _id, createdAt } = await this.executionDetailsRepository.create(entity, { writeConcern: 1 });

    await this.createTraceLogEntry(command, createdAt);

    return {
      id: _id,
      createdAt,
    };
  }

  private cleanFromNulls(
    entity: Omit<ExecutionDetailsEntity, 'createdAt' | '_id'>
  ): Omit<ExecutionDetailsEntity, 'createdAt' | '_id'> {
    const cleanEntity = { ...entity };

    if (cleanEntity.raw === null) {
      delete cleanEntity.raw;
    }

    return cleanEntity;
  }

  private async createTraceLogEntry(command: CreateExecutionDetailsCommand, createdAt: string): Promise<void> {
    const traceData = {
      created_at: LogRepository.formatDateTime64(new Date(createdAt)),
      organization_id: command.organizationId,
      environment_id: command.environmentId,
      user_id: null,
      subscriber_id: command.subscriberId || null,
      event_type: 'message_detail',
      title: command.detail,
      message: null,
      raw_data: command.raw || null,
      status: this.mapExecutionStatusToTraceStatus(command.status),
      entity_type: 'step_run',
      entity_id: command.jobId,
    };

    await this.traceLogRepository.create(traceData);
  }

  private mapExecutionStatusToTraceStatus(status: ExecutionDetailsStatusEnum): string {
    switch (status) {
      case ExecutionDetailsStatusEnum.SUCCESS:
        return 'success';
      case ExecutionDetailsStatusEnum.FAILED:
        return 'error';
      case ExecutionDetailsStatusEnum.PENDING:
        return 'pending';
      case ExecutionDetailsStatusEnum.WARNING:
        return 'warning';
      default:
        return 'unknown';
    }
  }
}
