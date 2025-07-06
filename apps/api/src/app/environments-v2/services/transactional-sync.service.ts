import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, ClientSession } from '@novu/dal';

@Injectable()
export class TransactionalSyncService {
  constructor(
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async executeWithTransaction<T>(
    operation: (session: ClientSession | null) => Promise<T>,
    operationName: string = 'sync operation'
  ): Promise<T> {
    this.logger.info(`Starting transactional ${operationName}`);

    try {
      return await this.environmentRepository.withTransaction(async (session) => {
        if (session) {
          this.logger.debug(`Executing ${operationName} within transaction`);
        } else {
          this.logger.debug(`Executing ${operationName} without transaction (non-replica set mode)`);
        }

        const result = await operation(session);

        if (session) {
          this.logger.debug(`Successfully completed ${operationName} within transaction`);
        } else {
          this.logger.debug(`Successfully completed ${operationName} without transaction`);
        }

        return result;
      });
    } catch (error) {
      this.logger.error(`Transaction failed for ${operationName}: ${error.message}`);
      throw error;
    }
  }
}
