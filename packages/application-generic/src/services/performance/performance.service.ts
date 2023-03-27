import {
  monitorEventLoopDelay,
  performance,
  PerformanceObserver,
} from 'perf_hooks';
import { Logger } from '@nestjs/common';

export enum PerformanceContextEnum {
  CONTEXT_EVENT_LOOP_DELAY = 'PerformanceEventLoopDelay',
  CONTEXT_EVENT_LOOP_UTILIZATION = 'PerformanceEventLoopUtilization',
  CONTEXT_GARBAGE_COLLECTION = 'PerformanceGarbageCollection',
  CONTEXT_GENERAL = 'Performance',
  CONTEXT_MARK = 'PerformanceMark',
  CONTEXT_MEASURE = 'PerformanceMeasure',
}

enum MarkTypeEnum {
  END = 'end',
  START = 'start',
}

export interface IMark {
  id: string;
}

interface IMeasure {
  name: string;
  duration: number;
}

export class PerformanceService {
  private monitorEventLoopDelay;
  private performanceObserver: PerformanceObserver;
  private utilization;
  public _marks: string[] = [];
  public _measures: IMeasure[] = [];

  constructor() {
    this.performanceObserver = new PerformanceObserver((list, observer) => {
      list.getEntries().forEach((entry) => {
        if (entry?.entryType === 'mark') {
          this.marks.push(`[${entry.name}]`);
          this.marks.push(`startTime: ${entry.startTime}`);
        }

        if (entry?.entryType === 'measure') {
          this.measures.push({ name: entry.name, duration: entry.duration });
        }
      });
    });
    this.monitorEventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
    this.start();
  }

  get marks(): string[] {
    return this._marks;
  }

  set marks(data: string[]) {
    this._marks = data;
  }

  get measures(): IMeasure[] {
    return this._measures;
  }

  set measures(data: IMeasure[]) {
    this._measures = data;
  }

  private start() {
    this.monitorEventLoopDelay.enable();
    this.utilization = performance.eventLoopUtilization();
    this.track();
  }

  private buildMark(markId: string, markType: MarkTypeEnum): string {
    return `${markType}:${markId}`;
  }

  private buildMarkStart(mark: IMark): string {
    return this.buildMark(this.getMarkId(mark), MarkTypeEnum.START);
  }

  private buildMarkEnd(mark: IMark): string {
    return this.buildMark(this.getMarkId(mark), MarkTypeEnum.END);
  }

  private getMarkId(mark: IMark): string {
    return mark.id;
  }

  public setStart(mark: IMark): void {
    performance.mark(this.buildMarkStart(mark));
    performance.eventLoopUtilization();
  }

  public setEnd(mark: IMark): void {
    performance.mark(this.buildMarkEnd(mark));
    performance.eventLoopUtilization();
    this.store(mark);
  }

  private store(mark: IMark): void {
    performance.measure(
      this.getMarkId(mark),
      this.buildMarkStart(mark),
      this.buildMarkEnd(mark)
    );
  }

  public clear(): void {
    this.marks = [];
    this.measures = [];
  }

  private resetInternals(): void {
    this.monitorEventLoopDelay.disable();
    this.performanceObserver.disconnect();
  }

  private publishMonitorEventLoopDelayStats(): void {
    const { min, max, mean, stddev, percentiles } = this.monitorEventLoopDelay;

    const p50 = percentiles.get(50);
    const p75 = percentiles.get(75);
    const p99 = percentiles.get(99);

    Logger.debug(
      'EVENT LOOP DELAY STATS',
      PerformanceContextEnum.CONTEXT_EVENT_LOOP_DELAY
    );
    Logger.debug(
      `Min: ${min} | Max: ${max} | Mean: ${mean} | StdDev: ${stddev} | P50: ${p50} | P75: ${p75} | P99: ${p99}`,
      PerformanceContextEnum.CONTEXT_EVENT_LOOP_DELAY
    );
  }

  private publishEventLoopUtilization(): void {
    const { idle, active, utilization } = performance.eventLoopUtilization(
      this.utilization
    );

    Logger.debug(
      'EVENT LOOP UTILIZATION',
      PerformanceContextEnum.CONTEXT_EVENT_LOOP_UTILIZATION
    );
    Logger.debug(
      `Idle: ${idle} | Active: ${active} | Utilization: ${utilization}`,
      PerformanceContextEnum.CONTEXT_EVENT_LOOP_UTILIZATION
    );
  }

  public filterMarks(needle: string, terms: string[]): boolean {
    return terms.map((term) => needle.includes(term)).includes(true);
  }

  private publishMarks(): void {
    this.marks.forEach((mark) =>
      Logger.debug(mark, PerformanceContextEnum.CONTEXT_MARK)
    );
  }

  public calculateAverage(markFunctionName: string, durations: number[]): void {
    const sum = durations.reduce((a, b) => a + b, 0);
    const average = Number(sum) / Number(durations.length);

    Logger.debug(
      `${markFunctionName} | Average: ${average.toFixed(
        2
      )} ms from a total of ${durations.length}`,
      PerformanceContextEnum.CONTEXT_MEASURE
    );
  }

  public publishInternalResults(): void {
    this.publishMonitorEventLoopDelayStats();
    this.publishEventLoopUtilization();
    this.resetInternals();
    this.clear();
    this.start();
  }

  public track(): void {
    this.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });
  }
}
