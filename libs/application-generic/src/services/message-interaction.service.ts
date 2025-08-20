import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Trace, TraceLogRepository } from './analytic-logs/trace-log';

export interface MessageInteractionResult {
  success: boolean;
  processedTraceCount: number;
  error?: string;
}

@Injectable()
export class MessageInteractionService {
  constructor(
    private traceLogRepository: TraceLogRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async trace(traces: Omit<Trace, 'id' | 'expires_at'>[]): Promise<MessageInteractionResult> {
    try {
      if (traces.length > 0) {
        await this.traceLogRepository.createStepRun(traces);
        
        this.logger.debug(
          {
            traceCount: traces.length,
            organizationId: traces[0]?.organization_id,
            environmentId: traces[0]?.environment_id,
          },
          `Successfully logged ${traces.length} message interaction traces`
        );
      }

      return {
        success: true,
        processedTraceCount: traces.length,
      };
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          traceCount: traces.length,
          organizationId: traces[0]?.organization_id,
          environmentId: traces[0]?.environment_id,
        },
        `Failed to process message interaction traces`
      );

      return {
        success: false,
        processedTraceCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
