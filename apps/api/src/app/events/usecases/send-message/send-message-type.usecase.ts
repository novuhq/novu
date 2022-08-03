import { MessageRepository, NotificationEntity } from '@novu/dal';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { SendMessageCommand } from './send-message.command';

export abstract class SendMessageType {
  protected constructor(protected messageRepository: MessageRepository, protected createLogUsecase: CreateLog) {}

  public abstract execute(command: SendMessageCommand);

  protected async sendErrorStatus(
    message,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessage: string,
    command: SendMessageCommand,
    notification: NotificationEntity,
    logCodeEnum: LogCodeEnum
  ) {
    await this.messageRepository.updateMessageStatus(message._id, status, null, errorId, errorMessage);

    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.ERROR,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        text: errorMessage,
        userId: command.userId,
        subscriberId: command.subscriberId,
        code: logCodeEnum,
        templateId: notification._templateId,
      })
    );
  }
}
