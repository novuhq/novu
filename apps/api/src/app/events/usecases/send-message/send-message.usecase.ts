import { Injectable } from '@nestjs/common';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IPreferenceChannels,
  StepTypeEnum,
} from '@novu/shared';
import { SendMessageCommand } from './send-message.command';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { Digest } from './digest/digest.usecase';
import { matchMessageWithFilters } from '../trigger-event/message-filter.matcher';
import {
  JobEntity,
  SubscriberRepository,
  NotificationTemplateRepository,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageDelay } from './send-message-delay.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import {
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-template-preference';

@Injectable()
export class SendMessage {
  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessageChat: SendMessageChat,
    private sendMessagePush: SendMessagePush,
    private digest: Digest,
    private subscriberRepository: SubscriberRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository,
    private sendMessageDelay: SendMessageDelay
  ) {}

  public async execute(command: SendMessageCommand) {
    const shouldRun = await this.filter(command);
    const preferred = await this.filterPreferredChannels(command.job);

    if (!shouldRun || !preferred) {
      await this.jobRepository.updateStatus(command.organizationId, command.jobId, JobStatusEnum.CANCELED);

      return;
    }

    if (command.step.template.type !== StepTypeEnum.DELAY) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail:
            command.step.template.type === StepTypeEnum.DIGEST ? DetailEnum.START_DIGESTING : DetailEnum.START_SENDING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }

    switch (command.step.template.type) {
      case StepTypeEnum.SMS:
        return await this.sendMessageSms.execute(command);
      case StepTypeEnum.IN_APP:
        return await this.sendMessageInApp.execute(command);
      case StepTypeEnum.EMAIL:
        return await this.sendMessageEmail.execute(command);
      case StepTypeEnum.CHAT:
        return await this.sendMessageChat.execute(command);
      case StepTypeEnum.PUSH:
        return await this.sendMessagePush.execute(command);
      case StepTypeEnum.DIGEST:
        return await this.digest.execute(command);
      case StepTypeEnum.DELAY:
        return await this.sendMessageDelay.execute(command);
    }
  }

  private async filter(command: SendMessageCommand) {
    const data = await this.getFilterData(command);

    const shouldRun = matchMessageWithFilters(command.step, data);

    if (!shouldRun) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.FILTER_STEPS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            payload: data,
            filters: command.step.filters,
          }),
        })
      );
    }

    return shouldRun;
  }

  private async getFilterData(command: SendMessageCommand) {
    const fetchSubscriber = command.step?.filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'subscriber');
    });

    let subscriber;

    if (fetchSubscriber) {
      /// TODO: refactor command.subscriberId to command._subscriberId
      subscriber = await this.subscriberRepository.findById(command.subscriberId);
    }

    return {
      subscriber,
      payload: command.payload,
    };
  }

  private async filterPreferredChannels(job: JobEntity): Promise<boolean> {
    const template = await this.notificationTemplateRepository.findById(job._templateId, job._environmentId);
    const buildCommand = GetSubscriberTemplatePreferenceCommand.create({
      organizationId: job._organizationId,
      subscriberId: job._subscriberId,
      environmentId: job._environmentId,
      template,
    });

    const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(buildCommand);

    const result = this.isActionStep(job) || this.stepPreferred(preference, job);

    if (!result && !template.critical) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_FILTERED_BY_PREFERENCES,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(preference),
        })
      );
    }

    return result || template.critical;
  }

  private stepPreferred(preference: { enabled: boolean; channels: IPreferenceChannels }, job: JobEntity) {
    const templatePreferred = preference.enabled;

    const channelPreferred = Object.keys(preference.channels).some(
      (channelKey) => channelKey === job.type && preference.channels[job.type]
    );

    return templatePreferred && channelPreferred;
  }

  private isActionStep(job: JobEntity) {
    const channels = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT];

    return !channels.find((channel) => channel === job.type);
  }
}
