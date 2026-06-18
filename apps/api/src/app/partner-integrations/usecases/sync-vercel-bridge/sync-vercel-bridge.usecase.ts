import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ExecuteBridgeRequest } from '@novu/application-generic';
import { DiscoverOutput, GetActionEnum } from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import { Sync } from '../../../bridge/usecases/sync';
import { SyncCommand } from '../../../bridge/usecases/sync/sync.command';
import { SyncAgentsFromBridgeCommand } from '../sync-agents-from-bridge/sync-agents-from-bridge.command';
import { SyncAgentsFromBridge } from '../sync-agents-from-bridge/sync-agents-from-bridge.usecase';
import { SyncVercelBridgeCommand } from './sync-vercel-bridge.command';

@Injectable()
export class SyncVercelBridge {
  constructor(
    private readonly executeBridgeRequest: ExecuteBridgeRequest,
    private readonly syncUsecase: Sync,
    private readonly syncAgentsFromBridge: SyncAgentsFromBridge
  ) {}

  async execute(command: SyncVercelBridgeCommand): Promise<void> {
    const discover = await this.discoverBridge(command);

    await this.syncUsecase.execute(
      SyncCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        environmentId: command.environmentId,
        bridgeUrl: command.bridgeUrl,
        source: 'vercel',
        discoverResult: discover,
      })
    );

    await this.syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        environmentId: command.environmentId,
        bridgeUrl: command.bridgeUrl,
        isProduction: command.isProduction,
        discoverResult: discover,
      })
    );
  }

  private async discoverBridge(command: SyncVercelBridgeCommand): Promise<DiscoverOutput> {
    try {
      const discover = (await this.executeBridgeRequest.execute({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        statelessBridgeUrl: command.bridgeUrl,
        action: GetActionEnum.DISCOVER,
        retriesLimit: 1,
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
        enforceSsrfProtection: true,
      })) as DiscoverOutput;

      if (!discover) {
        throw new BadRequestException('Invalid Bridge URL Response');
      }

      return discover;
    } catch (error) {
      if (error instanceof HttpException) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
