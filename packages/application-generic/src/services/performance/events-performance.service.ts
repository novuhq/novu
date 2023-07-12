import { Injectable, Logger } from '@nestjs/common';

import {
  IMark,
  PerformanceContextEnum,
  PerformanceService,
} from './performance.service';

enum MarkFunctionNameEnum {
  CREATE_NOTIFICATION_JOBS = 'createNotificationJobs',
  DIGEST_FILTER_STEPS = 'digestFilterSteps',
  ENDPOINT_TRIGGER_EVENT = 'endpoint:triggerEvent',
  TRIGGER_EVENT = 'triggerEvent',
}

@Injectable()
export class EventsPerformanceService {
  private readonly performanceService = new PerformanceService();

  private shouldExecute(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  private publishMarks(showLogs: boolean): void {
    if (showLogs) {
      const eventsMarks = Object.values(MarkFunctionNameEnum);

      this.performanceService.marks.forEach((mark) => {
        if (this.performanceService.filterMarks(mark, eventsMarks)) {
          Logger.debug(mark, PerformanceContextEnum.CONTEXT_MARK);
        }
      });
    }
  }

  private publishMeasures(showLogs: boolean): void {
    const measures: Record<string, number[]> = {};

    this.performanceService.measures.forEach((measure) => {
      const functionName = measure.name.split(':')[0];
      if (!measures[functionName]) {
        measures[functionName] = [measure.duration];

        return;
      }

      measures[functionName].push(measure.duration);

      if (showLogs) {
        Logger.debug(
          `Duration: ${measure.duration.toFixed(2)} ms| Id: ${measure.name}`,
          PerformanceContextEnum.CONTEXT_MEASURE
        );
      }
    });

    Object.keys(measures).forEach((key) => {
      this.performanceService.calculateAverage(key, measures[key]);
    });
  }

  public setEnd(mark: IMark): void {
    if (this.shouldExecute()) {
      this.performanceService.setEnd(mark);
    }
  }

  private setStart(mark: IMark): IMark {
    if (this.shouldExecute()) {
      this.performanceService.setStart(mark);
    }

    return mark;
  }

  public buildDigestFilterStepsMark(
    transactionId: string,
    templateId: string,
    notificationId: string,
    subscriberId: string
  ): IMark {
    const mark = {
      id: `${MarkFunctionNameEnum.DIGEST_FILTER_STEPS}:event:${transactionId}:template:${templateId}:notification:${notificationId}:subscriber:${subscriberId}:steps`,
    };

    return this.setStart(mark);
  }

  public buildEndpointTriggerEventMark(transactionId: string): IMark {
    const mark = {
      id: `${MarkFunctionNameEnum.ENDPOINT_TRIGGER_EVENT}:event:${transactionId}`,
    };

    return this.setStart(mark);
  }

  public buildTriggerEventMark(
    notificationTemplateId: string,
    transactionId: string
  ): IMark {
    const mark = {
      id: `${MarkFunctionNameEnum.TRIGGER_EVENT}:notificationTemplate:${notificationTemplateId}:event:${transactionId}`,
    };

    return this.setStart(mark);
  }

  public buildCreateNotificationJobsMark(
    notificationTemplateId: string,
    transactionId: string,
    subscriberId: string
  ): IMark {
    const mark = {
      id: `${MarkFunctionNameEnum.CREATE_NOTIFICATION_JOBS}:notificationTemplate:${notificationTemplateId}:event:${transactionId}:subscriber:${subscriberId}`,
    };

    return this.setStart(mark);
  }

  public publishResults(): void {
    if (this.shouldExecute()) {
      this.publishMarks(false);
      this.publishMeasures(false);
      this.performanceService.clear();
    }
  }
}
