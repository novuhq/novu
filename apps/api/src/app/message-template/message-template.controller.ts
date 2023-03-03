import { Controller } from '@nestjs/common';
import { LogDecorator } from '@novu/application-generic';

@Controller('/message-templates')
@LogDecorator()
export class MessageTemplateController {}
