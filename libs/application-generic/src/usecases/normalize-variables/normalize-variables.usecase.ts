import { Injectable } from '@nestjs/common';
import {
  SubscriberEntity,
  SubscriberRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import { FilterPartTypeEnum, IMessageFilter } from '@novu/shared';
import { IFilterVariables } from '../../utils/filter-processing-details';
import { CachedEntity } from '../../services/cache/interceptors/cached-entity.interceptor';
import { buildSubscriberKey } from '../../services/cache/key-builders/entities';
import { ConditionsFilterCommand } from '../conditions-filter';

/**
 * This service class is responsible for normalizing the variables used within the message filtering process.
 * Normalization in this context refers to ensuring all necessary data is present for filter evaluation.
 *
 * It achieves this by:
 *  1. Checking if subscriber and tenant information are provided in the command itself.
 *  2. If missing, it tries to infer them from the filters and job data (if available).
 *  3. Finally, it fetches the complete subscriber and tenant entities from the database if necessary.
 *
 * By providing a normalized set of variables, this service simplifies filter evaluation and promotes code clarity.
 */
@Injectable()
export class NormalizeVariables {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private tenantRepository: TenantRepository,
  ) {}

  public async execute(command: ConditionsFilterCommand) {
    const filterVariables: IFilterVariables = {};

    const combinedFilters = [
      command.step,
      ...(command.step?.variants || []),
    ].flatMap((variant) => (variant?.filters ? variant?.filters : []));

    filterVariables.subscriber = await this.fetchSubscriberIfMissing(
      command,
      combinedFilters,
    );
    filterVariables.tenant = await this.fetchTenantIfMissing(
      command,
      combinedFilters,
    );
    filterVariables.payload = command.variables?.payload
      ? command.variables?.payload
      : (command.job?.payload ?? undefined);

    filterVariables.step = command.variables?.step ?? undefined;
    filterVariables.actor = command.variables?.actor ?? undefined;

    return filterVariables;
  }
  private async fetchSubscriberIfMissing(
    command: ConditionsFilterCommand,
    filters: IMessageFilter[],
  ): Promise<SubscriberEntity | undefined> {
    if (command.variables?.subscriber) {
      return command.variables.subscriber;
    }

    const subscriberFilterExist = filters?.find((filter) => {
      return filter?.children?.find(
        (item) => item?.on === FilterPartTypeEnum.SUBSCRIBER,
      );
    });

    if (subscriberFilterExist && command.job) {
      return (
        (await this.getSubscriberBySubscriberId({
          subscriberId: command.job.subscriberId,
          _environmentId: command.environmentId,
        })) ?? undefined
      );
    }

    return undefined;
  }

  private async fetchTenantIfMissing(
    command: ConditionsFilterCommand,
    filters: IMessageFilter[],
  ): Promise<TenantEntity | undefined> {
    if (command.variables?.tenant) {
      return command.variables.tenant;
    }

    const tenantIdentifier =
      typeof command.job?.tenant === 'string'
        ? command.job?.tenant
        : command.job?.tenant?.identifier;
    const tenantFilterExist = filters?.find((filter) => {
      return filter?.children?.find(
        (item) => item?.on === FilterPartTypeEnum.TENANT,
      );
    });

    if (tenantFilterExist && tenantIdentifier && command.job) {
      return (
        (await this.tenantRepository.findOne({
          _environmentId: command.job._environmentId,
          identifier: tenantIdentifier,
        })) ?? undefined
      );
    }

    return undefined;
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  public async getSubscriberBySubscriberId({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }) {
    return await this.subscriberRepository.findOne({
      _environmentId,
      subscriberId,
    });
  }
}
