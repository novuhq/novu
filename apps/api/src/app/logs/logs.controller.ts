import { Controller } from '@nestjs/common';
import { logDecorator } from '@novu/application-generic';

@Controller('/logs')
@logDecorator()
export class LogsController {}
