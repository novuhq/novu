import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { LogDecorator, PinoLogger } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { AddressingTypeEnum, TriggerRequestCategoryEnum } from '@novu/shared';
import { TriggerEventResponseDto } from '../../../events/dtos/trigger-event-response.dto';
import { ParseEventRequest, ParseEventRequestMulticastCommand } from '../../../events/usecases/parse-event-request';
import { KEYLESS_ENVIRONMENT_PREFIX, KEYLESS_WORKFLOW_IDENTIFIER } from '../../utils';
import { TriggerKeylessEventCommand } from './trigger-keyless-event.command';

/**
 * Triggers the keyless / demo "hello-world" workflow for an inbox subscriber
 * session. The endpoint backing this use case is intentionally restricted: an
 * inbox subscriber JWT can only fire the keyless demo workflow, only target
 * itself as the recipient, and only when the caller belongs to a keyless
 * environment. This prevents the inbox JWT (which is meant for end-user inbox
 * UI) from being used to spam arbitrary workflows or recipients.
 */
@Injectable()
export class TriggerKeylessEvent {
  constructor(
    private readonly parseEventRequest: ParseEventRequest,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @LogDecorator()
  async execute(command: TriggerKeylessEventCommand): Promise<TriggerEventResponseDto> {
    if (command.workflowIdentifier !== KEYLESS_WORKFLOW_IDENTIFIER) {
      throw new ForbiddenException(`Inbox subscribers may only trigger the "${KEYLESS_WORKFLOW_IDENTIFIER}" workflow.`);
    }

    if (!this.isSelfRecipient(command.recipient, command.subscriberId)) {
      throw new ForbiddenException('Inbox subscribers may only trigger notifications for themselves.');
    }

    const environment = await this.assertKeylessEnvironment(command.environmentId);
    const userId = this.resolveKeylessUserId(environment);

    const result = await this.parseEventRequest.execute(
      ParseEventRequestMulticastCommand.create({
        userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        identifier: KEYLESS_WORKFLOW_IDENTIFIER,
        payload: command.payload || {},
        overrides: {},
        to: { subscriberId: command.subscriberId },
        addressingType: AddressingTypeEnum.MULTICAST,
        requestCategory: TriggerRequestCategoryEnum.SINGLE,
        requestId: command.requestId,
      })
    );

    return result as unknown as TriggerEventResponseDto;
  }

  /**
   * Validates that the request originates from a keyless / demo environment.
   * Customer environments must never be reachable through this endpoint, even
   * if they happen to host a workflow named `hello-world`.
   */
  private async assertKeylessEnvironment(environmentId: string): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findOne({ _id: environmentId });

    if (!environment) {
      throw new ForbiddenException('Environment not found for inbox subscriber.');
    }

    if (!environment.identifier?.startsWith(KEYLESS_ENVIRONMENT_PREFIX)) {
      throw new ForbiddenException('Inbox events can only be triggered from a keyless environment.');
    }

    return environment;
  }

  /**
   * The keyless environment is provisioned by `Session.processKeyless` with a
   * single API key whose `_userId` is the demo user that owns the workflow.
   * Reusing that user id keeps audit / analytics / feature-flag attribution
   * pointed at a real `UserEntity` instead of leaking the subscriber id into
   * the trigger pipeline.
   */
  private resolveKeylessUserId(environment: EnvironmentEntity): string {
    const keylessUserId = environment.apiKeys?.[0]?._userId;

    if (!keylessUserId) {
      this.logger.error({ environmentId: environment._id }, 'Keyless environment has no API key owner.');
      throw new InternalServerErrorException('Keyless environment is misconfigured.');
    }

    return keylessUserId;
  }

  /**
   * Validates that the recipient described by `to` resolves to a single
   * subscriber and that subscriber matches the authenticated session. Topic
   * and array-based recipients are rejected outright because they could be
   * used to notify other subscribers in the environment.
   */
  private isSelfRecipient(to: unknown, subscriberId: string): boolean {
    if (typeof to === 'string') {
      return to === subscriberId;
    }

    if (Array.isArray(to)) {
      return false;
    }

    if (
      to !== null &&
      typeof to === 'object' &&
      'subscriberId' in to &&
      typeof (to as { subscriberId: unknown }).subscriberId === 'string'
    ) {
      return (to as { subscriberId: string }).subscriberId === subscriberId;
    }

    return false;
  }
}
