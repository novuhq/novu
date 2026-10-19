import { PromoteTypeChangeCommand } from '../promote-type-change.command';

export interface INotificationTemplateChangeService {
  execute(command: PromoteTypeChangeCommand): Promise<any>;
}
