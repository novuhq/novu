import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { PinoLogger } from '@novu/application-generic';
import { actionStepSchemas, channelStepSchemas } from '@novu/framework/internal';
import { JsonSchemaMock } from '../../../util/json-schema-mock';
import { MockStepResultOptions } from '../preview.types';
import { LOG_CONTEXT } from '../preview.constants';

@Injectable()
export class MockDataGeneratorService {
  constructor(private readonly logger: PinoLogger) {}

  /**
   * Generates realistic mock data for step results using framework schemas,
   * with special handling for digest steps that include workflow payload data.
   */
  generateMockStepResult(options: MockStepResultOptions): Record<string, unknown> {
    const { stepType, workflow } = options;

    if (!stepType) {
      return {};
    }

    try {
      if (stepType === 'digest') {
        return this.generateDigestStepResult(workflow);
      }

      let resultSchema: unknown = null;

      if (stepType in channelStepSchemas) {
        resultSchema = channelStepSchemas[stepType as keyof typeof channelStepSchemas].result;
      } else if (stepType in actionStepSchemas) {
        resultSchema = actionStepSchemas[stepType as keyof typeof actionStepSchemas].result;
      }

      if (resultSchema) {
        return JsonSchemaMock.generate(resultSchema) as Record<string, unknown>;
      }

      return {};
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          stepType,
        },
        'Failed to generate mock step result, falling back to empty object',
        LOG_CONTEXT
      );

      return {};
    }
  }

  private generateDigestStepResult(workflow?: NotificationTemplateEntity): Record<string, unknown> {
    try {
      let payloadMockData = {};

      if (workflow?.payloadSchema) {
        payloadMockData = JsonSchemaMock.generate(workflow.payloadSchema) as Record<string, unknown>;
      }

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      oneDayAgo.setHours(12, 0, 0, 0);

      const digestEvents = [
        {
          id: 'event-id-123',
          time: oneDayAgo.toISOString(),
          payload: payloadMockData,
        },
      ];

      return {
        eventCount: digestEvents.length,
        events: digestEvents,
      };
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          workflowId: workflow?._id,
          payloadSchema: workflow?.payloadSchema,
        },
        'Failed to generate digest result with payload data, falling back to basic digest result',
        LOG_CONTEXT
      );

      // Create a basic digest result without using JsonSchemaMock
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      oneDayAgo.setHours(12, 0, 0, 0);

      const digestEvents = [
        {
          id: 'event-id-123',
          time: oneDayAgo.toISOString(),
          payload: {},
        },
      ];

      return {
        eventCount: digestEvents.length,
        events: digestEvents,
      };
    }
  }

  /**
   * Creates a complete subscriber object with all standard fields populated,
   * used when V2 template editor requires full subscriber context for previews.
   */
  createFullSubscriberObject(): Record<string, unknown> {
    return {
      subscriberId: 'subscriberId',
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      phone: 'phone',
      avatar: 'avatar',
      locale: 'locale',
      data: {},
    };
  }
}
