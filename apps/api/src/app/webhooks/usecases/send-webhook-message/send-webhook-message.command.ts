import { IsDefined, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseCommand } from '@novu/application-generic';

import { WorkflowResponseDto } from '../../../workflows-v2/dtos/workflow-response.dto'; // Corrected path
import { WebhookEventEnum, WebhookObjectTypeEnum } from '../../dtos/webhook-payload.dto';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class SendWebhookMessageCommand extends EnvironmentCommand {
  @IsEnum(WebhookEventEnum)
  eventType: WebhookEventEnum;

  @IsDefined()
  @IsEnum(WebhookObjectTypeEnum)
  objectType: WebhookObjectTypeEnum;

  /*
   * Assuming the payload data structure matches WorkflowResponseDto for now
   * This might need to be made more generic if other object types are introduced
   */
  @IsDefined()
  @ValidateNested()
  @Type(() => WorkflowResponseDto)
  payload: WorkflowResponseDto;
}
