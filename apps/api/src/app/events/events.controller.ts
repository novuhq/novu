import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { TriggerEvent, TriggerEventCommand } from './usecases/trigger-event';
import { UserSession } from '../shared/framework/user.decorator';
import { TriggerEventDto } from './dto/trigger-event.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';

@Controller('events')
export class EventsController {
  constructor(private triggerEvent: TriggerEvent) {}

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger')
  trackEvent(@UserSession() user: IJwtPayload, @Body() body: TriggerEventDto) {
    return this.triggerEvent.execute(
      TriggerEventCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload,
        transactionId: uuidv4(),
      })
    );
  }
}
