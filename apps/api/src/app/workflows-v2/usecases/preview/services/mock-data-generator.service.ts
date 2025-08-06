import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { actionStepSchemas, channelStepSchemas } from '@novu/framework/internal';
import { DEFAULT_LOCALE } from '@novu/shared';
import { JsonSchemaMock } from '../../../util/json-schema-mock';
import { LOG_CONTEXT } from '../preview.constants';
import { MockStepResultOptions } from '../preview.types';

const DEFAULT_DIGEST_EVENTS_COUNT = 3;

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

      const digestEvents = this.createDigestEvents(payloadMockData);

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

      const digestEvents = this.createDigestEvents({});

      return {
        eventCount: digestEvents.length,
        events: digestEvents,
      };
    }
  }

  private createDigestEvents(payloadMockData: Record<string, unknown>) {
    return Array.from({ length: DEFAULT_DIGEST_EVENTS_COUNT }, (_, index) => {
      const eventTime = new Date();
      eventTime.setDate(eventTime.getDate() - 1);
      eventTime.setHours(12, 0, 0, 0);
      eventTime.setMinutes(eventTime.getMinutes() - index * 5);

      return {
        id: `example-id-${index + 1}`,
        time: eventTime.toISOString(),
        payload: payloadMockData,
      };
    });
  }

  /**
   * Creates a complete subscriber object with all standard fields populated,
   * used when V2 template editor requires full subscriber context for previews.
   */
  createFullSubscriberObject(): Record<string, unknown> {
    return {
      subscriberId: '123456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.png',
      locale: DEFAULT_LOCALE,
      timezone: 'America/New_York',
      data: {},
    };
  }
}
