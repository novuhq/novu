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
    operation: (session: ClientSession) => Promise<T>,
    operationName: string = 'sync operation'
  ): Promise<T> {
    this.logger.info(`Starting transactional ${operationName}`);

    try {
      return await this.environmentRepository.withTransaction(async (session) => {
        this.logger.debug(`Executing ${operationName} within transaction`);

        const result = await operation(session);

        this.logger.debug(`Successfully completed ${operationName} within transaction`);

        return result;
      });
    } catch (error) {
      this.logger.error(`Transaction failed for ${operationName}: ${error.message}`);
      throw error;
    }
  }
}
