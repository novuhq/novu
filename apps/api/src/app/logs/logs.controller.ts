import { Controller } from '@nestjs/common';
import { LogDecorator } from '@novu/application-generic';

@Controller('/logs')
@LogDecorator()
export class LogsController {}
