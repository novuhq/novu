import { Injectable } from '@nestjs/common';
import { TriggerBulkCancelResponseDto } from '../../dtos/trigger-bulk-cancel-response.dto';
import { CancelDelayed, CancelDelayedCommand } from '../cancel-delayed';
import { ProcessBulkCancelCommand } from './process-bulk-cancel.command';

@Injectable()
export class ProcessBulkCancel {
  constructor(private cancelDelayed: CancelDelayed) {}

  async execute(command: ProcessBulkCancelCommand): Promise<TriggerBulkCancelResponseDto[]> {
    const results: TriggerBulkCancelResponseDto[] = [];

    for (const transactionId of command.transactionIds) {
      let result: TriggerBulkCancelResponseDto;

      try {
        const promise = await this.cancelDelayed.execute(
          CancelDelayedCommand.create({
            ...command,
            transactionId: transactionId,
          })
        );

        result = {
          transactionId,
          success: promise,
        };
      } catch (e) {
        let error: string[];
        if (e.response?.message) {
          error = Array.isArray(e.response?.message) ? e.response?.message : [e.response?.message];
        } else {
          error = [e.message];
        }

        result = {
          transactionId,
          success: false,
          error,
        };
      }

      results.push(result);
    }

    return results;
  }
}
