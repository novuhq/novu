import { Controller } from '@nestjs/common';
import { logDecorator } from '@novu/application-generic';

@Controller('/message-templates')
@logDecorator()
export class MessageTemplateController {}
