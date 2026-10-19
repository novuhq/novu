import { ITenantDefine } from '@novu/shared';
import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';

export class ProcessTenantCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  tenant: ITenantDefine;
}
