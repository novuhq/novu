import { NotificationTemplateEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

/**
 * @deprecated use commands in /workflows directory
 */
export class GetActiveIntegrationsStatusCommand extends EnvironmentWithUserCommand {
  workflows: NotificationTemplateEntity | NotificationTemplateEntity[];
}
