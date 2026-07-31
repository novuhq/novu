import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../auth/framework/external-api.decorator';
import { UserSession } from '../../../shared/framework/user.decorator';
import { IngestAgentEventsCommand } from './ingest-agent-events.command';
import { IngestAgentEvents } from './ingest-agent-events.usecase';
import { IngestAgentEventsBodyDto } from './ingest-agent-events-body.dto';

/**
 * SDK-native AgentEvent ingest. Dedicated route (distinct from the Thalamus
 * `/agents/events` webhook) so authentication is enforced by the standard
 * guard chain instead of re-implemented per handler.
 *
 * Success is HTTP 200 status-only (void → interceptor `{ data: null }`).
 * Per-envelope ack results are intentionally not returned.
 */
@Controller('/agents/events')
@ApiExcludeController()
export class AgentEventsIngestController {
  constructor(private readonly ingestAgentEvents: IngestAgentEvents) {}

  @Post('/ingest')
  @HttpCode(HttpStatus.OK)
  @RequireAuthentication()
  @ExternalApiAccessible()
  async ingest(@UserSession() user: UserSessionData, @Body() body: IngestAgentEventsBodyDto): Promise<void> {
    return this.ingestAgentEvents.execute(
      IngestAgentEventsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        events: body.events,
      })
    );
  }
}
