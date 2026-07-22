import { BadRequestException, Injectable } from '@nestjs/common';
import { ExecuteBridgeRequest, WorkflowResponseDto } from '@novu/application-generic';
import { DiscoverOutput, GetActionEnum } from '@novu/framework/internal';
import { isOutboundSsrfProtectionEnabled, ResourceOriginEnum } from '@novu/shared';
import { BuildVirtualWorkflows } from '../build-virtual-workflows';
import { DiscoverVirtualWorkflowsCommand } from './discover-virtual-workflows.command';

/**
 * Calls `discover` on a caller-supplied bridge URL and maps the response into
 * `WorkflowResponseDto`s without persisting anything. Backs the dashboard's
 * "Local" environment mode, where the bridge is the developer's local app
 * exposed through a tunnel.
 *
 * The bridge URL is user input on every request — callers must run
 * `assertSafeOutboundUrl` first (see `BridgeController`), and the outbound
 * request itself runs with the DNS-pinned SSRF guard enforced.
 */
@Injectable()
export class DiscoverVirtualWorkflows {
  constructor(
    private executeBridgeRequest: ExecuteBridgeRequest,
    private buildVirtualWorkflows: BuildVirtualWorkflows
  ) {}

  async execute(command: DiscoverVirtualWorkflowsCommand): Promise<{ workflows: WorkflowResponseDto[] }> {
    const discover = await this.executeDiscover(command);

    const workflows = await this.buildVirtualWorkflows.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      discoveredWorkflows: discover.workflows ?? [],
    });

    return { workflows };
  }

  private async executeDiscover(command: DiscoverVirtualWorkflowsCommand): Promise<DiscoverOutput> {
    // Bridge errors propagate untouched: `BridgeRequestError` is an
    // HttpException carrying `{ message, code }` (e.g. BRIDGE_AUTHENTICATION_FAILED
    // on HMAC mismatch), which the dashboard handshake branches on to guide the
    // user to the environment whose secret key matches their local app.
    const discover = (await this.executeBridgeRequest.execute({
      statelessBridgeUrl: command.bridgeUrl,
      environmentId: command.environmentId,
      action: GetActionEnum.DISCOVER,
      retriesLimit: 1,
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      enforceSsrfProtection: isOutboundSsrfProtectionEnabled(),
    })) as DiscoverOutput;

    if (!discover) {
      throw new BadRequestException('Invalid Bridge URL Response');
    }

    return discover;
  }
}
