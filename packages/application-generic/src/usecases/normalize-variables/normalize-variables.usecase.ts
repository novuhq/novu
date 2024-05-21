import { Injectable } from '@nestjs/common';
import {
  SubscriberEntity,
  SubscriberRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import { IMessageFilter } from '@novu/shared';
import { IFilterVariables } from '../../utils/filter-processing-details';
import { CachedEntity } from '../../services/cache/interceptors/cached-entity.interceptor';
import { buildSubscriberKey } from '../../services/cache/key-builders/entities';
import { ConditionsFilterCommand } from '../conditions-filter';

@Injectable()
export class NormalizeVariables {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private tenantRepository: TenantRepository
  ) {}

  public async execute(command: ConditionsFilterCommand) {
    const filterVariables: IFilterVariables = {};

    const combinedFilters = [
      command.step,
      ...(command.step?.variants || []),
    ].flatMap((variant) => (variant?.filters ? variant?.filters : []));

    filterVariables.subscriber = await this.fetchSubscriberIfMissing(
      command,
      combinedFilters
    );
    filterVariables.tenant = await this.fetchTenantIfMissing(
      command,
      combinedFilters
    );
    filterVariables.payload = command.variables?.payload
      ? command.variables?.payload
      : command.job?.payload ?? undefined;

    filterVariables.step = command.variables?.step ?? undefined;
    filterVariables.actor = command.variables?.actor ?? undefined;

    return filterVariables;
  }
  private async fetchSubscriberIfMissing(
    command: ConditionsFilterCommand,
    filters: IMessageFilter[]
  ): Promise<SubscriberEntity | undefined> {
    if (command.variables?.subscriber) {
      return command.variables.subscriber;
    }

    const subscriberFilterExist = filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'subscriber');
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
    filters: IMessageFilter[]
  ): Promise<TenantEntity | undefined> {
    if (command.variables?.tenant) {
      return command.variables.tenant;
    }

    const tenantIdentifier =
      typeof command.job?.tenant === 'string'
        ? command.job?.tenant
        : command.job?.tenant?.identifier;
    const tenantFilterExist = filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'tenant');
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
