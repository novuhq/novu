import { Injectable, Logger } from '@nestjs/common';

import { MessageTemplateRepository } from '@novu/dal';
import { ICondition, IMessageTemplate } from '@novu/shared';

import { SelectVariantCommand } from './select-variant.command';
import { ConditionsFilter } from '../conditions-filter';
import { ConditionsFilterCommand } from '../conditions-filter';
import { PlatformException } from '../../utils/exceptions';
import { IFilterVariables } from '../../utils/filter-processing-details';

const LOG_CONTEXT = 'SelectVariant';

@Injectable()
export class SelectVariant {
  constructor(
    private conditionsFilter: ConditionsFilter,
    private messageTemplateRepository: MessageTemplateRepository
  ) {}

  async execute(command: SelectVariantCommand): Promise<{
    messageTemplate: IMessageTemplate;
    conditions?: ICondition[];
  }> {
    if (!command.step.variants?.length) {
      return { messageTemplate: command.step.template };
    }

    if (!this.isFilterDataExist(command.filterData)) {
      return { messageTemplate: command.step.template };
    }

    for (const variant of command.step.variants) {
      if (!variant.filters?.length || !variant.active) {
        continue;
      }

      const { passed, conditions } = await this.conditionsFilter.filter(
        ConditionsFilterCommand.create({
          filters: variant.filters,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          step: command.step,
          job: command.job,
          variables: command.filterData,
        })
      );

      if (passed) {
        const messageTemplate = await this.messageTemplateRepository.findOne({
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          _id: variant._templateId,
        });

        if (!messageTemplate) {
          const errorMessage = `Variant message template with id ${variant._templateId} not found`;
          Logger.error(
            {
              variantTemplateId: variant._templateId,
              filters: variant.filters,
              organizationId: command.organizationId,
              transactionId: command.job.transactionId,
              conditions,
            },
            errorMessage,
            LOG_CONTEXT
          );

          throw new PlatformException(errorMessage);
        }

        return { messageTemplate, conditions };
      }
    }

    return { messageTemplate: command.step.template };
  }

  private isFilterDataExist(filterData: IFilterVariables) {
    return (
      !!filterData.tenant ||
      !!filterData.payload ||
      !!filterData.subscriber ||
      !!filterData.webhook
    );
  }
}
