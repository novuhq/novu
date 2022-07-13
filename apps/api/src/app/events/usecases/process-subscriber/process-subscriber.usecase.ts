import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  SubscriberRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  JobEntity,
  JobStatusEnum,
  JobRepository,
  NotificationStepEntity,
} from '@novu/dal';
import { ChannelTypeEnum, DigestTypeEnum, LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { ProcessSubscriberCommand } from './process-subscriber.command';
import { matchMessageWithFilters } from '../trigger-event/message-filter.matcher';
import { ISubscribersDefine } from '@novu/node';
import * as moment from 'moment';

@Injectable()
export class ProcessSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private createSubscriberUsecase: CreateSubscriber,
    private createLogUsecase: CreateLog,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository
  ) {}

  public async execute(command: ProcessSubscriberCommand): Promise<JobEntity[]> {
    const template = await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);

    const subscriber: SubscriberEntity = await this.getSubscriber(command);
    if (subscriber === null) {
      return [];
    }

    const notification = await this.createNotification(command, template._id, subscriber);

    const matchedSteps = matchMessageWithFilters(
      template.steps.filter((step) => step.active === true),
      command.payload
    );

    let steps: NotificationStepEntity[] = [];

    const digestStep = matchedSteps.find((step) => step.template.type === ChannelTypeEnum.DIGEST);

    if (!digestStep) {
      for (const step of matchedSteps) {
        steps.push(step);
      }
    }

    if (digestStep) {
      const type = digestStep.metadata.type;
      if (type === DigestTypeEnum.REGULAR) {
        steps = await this.filterStepsRegularDigest(matchedSteps, subscriber._id, command);
      }
      if (type === DigestTypeEnum.BACKOFF) {
        steps = await this.filterStepsBackoffDigest(matchedSteps, subscriber._id, command);
      }
    }

    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.INFO,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        text: 'Request processed',
        userId: command.userId,
        subscriberId: subscriber._id,
        code: LogCodeEnum.TRIGGER_PROCESSED,
        templateId: notification._templateId,
      })
    );

    return steps.map((step): JobEntity => {
      return {
        identifier: command.identifier,
        payload: command.payload,
        step,
        transactionId: command.transactionId,
        _notificationId: notification._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _userId: command.userId,
        _subscriberId: subscriber._id,
        status: JobStatusEnum.PENDING,
        _templateId: notification._templateId,
        digest: step.metadata,
        type: step.template.type,
      };
    });
  }

  private async getSubscriber(command: ProcessSubscriberCommand): Promise<SubscriberEntity> {
    const subscriberPayload = command.to;
    const subscriber = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      subscriberId: subscriberPayload.subscriberId,
    });

    if (subscriber && !this.subscriberNeedUpdate(subscriber, subscriberPayload)) {
      return subscriber;
    }

    return await this.createOrUpdateSubscriber(command, subscriberPayload);
  }

  private async createOrUpdateSubscriber(command: ProcessSubscriberCommand, subscriberPayload) {
    return await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: subscriberPayload?.subscriberId,
        email: subscriberPayload?.email,
        firstName: subscriberPayload?.firstName,
        lastName: subscriberPayload?.lastName,
        phone: subscriberPayload?.phone,
        avatar: subscriberPayload?.avatar,
      })
    );
  }

  private subscriberNeedUpdate(subscriber: SubscriberEntity, subscriberPayload: ISubscribersDefine): boolean {
    return (
      (subscriberPayload?.email && subscriber?.email !== subscriberPayload?.email) ||
      (subscriberPayload?.firstName && subscriber?.firstName !== subscriberPayload?.firstName) ||
      (subscriberPayload?.lastName && subscriber?.lastName !== subscriberPayload?.lastName) ||
      (subscriberPayload?.phone && subscriber?.phone !== subscriberPayload?.phone) ||
      (subscriberPayload?.avatar && subscriber?.avatar !== subscriberPayload?.avatar)
    );
  }

  private async createNotification(
    command: ProcessSubscriberCommand,
    templateId: string,
    subscriber: SubscriberEntity
  ) {
    return await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: templateId,
      transactionId: command.transactionId,
    });
  }

  private createTriggerStep(command: ProcessSubscriberCommand): NotificationStepEntity {
    return {
      template: {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _creatorId: command.userId,
        type: ChannelTypeEnum.TRIGGER,
        content: '',
      },
      _templateId: command.templateId,
    };
  }

  private async filterStepsRegularDigest(
    matchedSteps: NotificationStepEntity[],
    subscriberId: string,
    command: ProcessSubscriberCommand
  ) {
    const steps = [this.createTriggerStep(command)];
    let delayedDigests: JobEntity = null;
    for (const step of matchedSteps) {
      if (step.template.type !== ChannelTypeEnum.DIGEST) {
        if (delayedDigests && !delayedDigests.digest.updateMode) {
          continue;
        }

        if (delayedDigests && delayedDigests.digest.updateMode && delayedDigests.type !== ChannelTypeEnum.IN_APP) {
          continue;
        }

        steps.push(step);
        continue;
      }

      let where: any = {
        status: JobStatusEnum.DELAYED,
        _subscriberId: subscriberId,
        _templateId: command.templateId,
        _environmentId: command.environmentId,
      };

      if (step.metadata.digestKey) {
        where = {
          ...where,
          digest: {
            digestKey: step.metadata.digestKey,
          },
        };
      }

      delayedDigests = await this.jobRepository.findOne(where);

      if (delayedDigests && step.metadata.digestKey) {
        if (command.payload[step.metadata.digestKey] === delayedDigests.payload[step.metadata.digestKey]) {
          delayedDigests = null;
        }
      }
      if (!delayedDigests) {
        steps.push(step);
      }
    }

    return steps;
  }

  private async filterStepsBackoffDigest(
    matchedSteps: NotificationStepEntity[],
    subscriberId: string,
    command: ProcessSubscriberCommand
  ) {
    const steps = [this.createTriggerStep(command)];
    for (const step of matchedSteps) {
      if (step.template.type === ChannelTypeEnum.DIGEST) {
        const from = moment().subtract(step.metadata.backoffAmount, step.metadata.backoffUnit).toDate();
        const trigger = await this.jobRepository.findOne({
          updatedAt: {
            $gte: from,
          },
          _templateId: command.templateId,
          status: JobStatusEnum.COMPLETED,
          type: ChannelTypeEnum.TRIGGER,
          _environmentId: command.environmentId,
          _subscriberId: subscriberId,
        });
        if (!trigger) {
          continue;
        }

        let where: any = {
          updatedAt: {
            $gte: from,
          },
          _templateId: command.templateId,
          type: ChannelTypeEnum.DIGEST,
          _environmentId: command.environmentId,
          _subscriberId: subscriberId,
        };

        if (step.metadata.digestKey) {
          where = {
            ...where,
            digest: {
              digestKey: step.metadata.digestKey,
            },
          };
        }

        let digest = await this.jobRepository.findOne(where);

        if (digest && step.metadata.digestKey) {
          if (command.payload[step.metadata.digestKey] === digest.payload[step.metadata.digestKey]) {
            digest = null;
          }
        }

        if (digest) {
          return steps;
        }
        steps.push(step);
        continue;
      }
      steps.push(step);
    }

    return steps;
  }
}
