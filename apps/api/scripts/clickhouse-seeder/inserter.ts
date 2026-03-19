import { ClickHouseClient } from '@clickhouse/client';

export interface InsertStats {
  workflowRuns: number;
  stepRuns: number;
  traces: number;
  duration: number;
}

function formatDateForClickHouse(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

function transformRecordDates(record: any): any {
  const transformed = { ...record };
  for (const key of Object.keys(transformed)) {
    if (transformed[key] instanceof Date) {
      transformed[key] = formatDateForClickHouse(transformed[key]);
    }
  }

  return transformed;
}

export class ClickHouseInserter {
  private stats: InsertStats = {
    workflowRuns: 0,
    stepRuns: 0,
    traces: 0,
    duration: 0,
  };

  constructor(
    private readonly client: ClickHouseClient,
    private readonly batchSize: number
  ) {}

  async insertWorkflowRuns(records: any[]): Promise<void> {
    const startTime = Date.now();
    await this.insertInBatches('workflow_runs', records, true);
    this.stats.workflowRuns += records.length;
    this.stats.duration += Date.now() - startTime;
  }

  async insertStepRuns(records: any[]): Promise<void> {
    const startTime = Date.now();
    await this.insertInBatches('step_runs', records, true);
    this.stats.stepRuns += records.length;
    this.stats.duration += Date.now() - startTime;
  }

  async insertTraces(records: any[]): Promise<void> {
    const startTime = Date.now();
    await this.insertInBatches('traces', records, true);
    this.stats.traces += records.length;
    this.stats.duration += Date.now() - startTime;
  }

  async insertWorkflowRunsSilent(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const startTime = Date.now();
    await this.insertDirect('workflow_runs', records);
    this.stats.workflowRuns += records.length;
    this.stats.duration += Date.now() - startTime;
  }

  async insertStepRunsSilent(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const startTime = Date.now();
    await this.insertDirect('step_runs', records);
    this.stats.stepRuns += records.length;
    this.stats.duration += Date.now() - startTime;
  }

  async insertTracesSilent(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const startTime = Date.now();
    await this.insertDirect('traces', records);
    this.stats.traces += records.length;
    this.stats.duration += Date.now() - startTime;
  }

  private async insertDirect(table: string, records: any[]): Promise<void> {
    const transformedRecords = records.map(transformRecordDates);
    await this.client.insert({
      table,
      values: transformedRecords,
      format: 'JSONEachRow',
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });
  }

  private async insertInBatches(table: string, records: any[], logProgress = true): Promise<void> {
    const totalBatches = Math.ceil(records.length / this.batchSize);

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize).map(transformRecordDates);
      const currentBatch = Math.floor(i / this.batchSize) + 1;

      await this.client.insert({
        table,
        values: batch,
        format: 'JSONEachRow',
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 1,
        },
      });

      if (logProgress) {
        this.logProgress(table, currentBatch, totalBatches, batch.length);
      }
    }
  }

  private logProgress(table: string, currentBatch: number, totalBatches: number, batchSize: number): void {
    const percentage = ((currentBatch / totalBatches) * 100).toFixed(1);
    console.log(`  [${table}] Batch ${currentBatch}/${totalBatches} (${percentage}%) - ${batchSize} records inserted`);
  }

  getStats(): InsertStats {
    return { ...this.stats };
  }

  printStats(): void {
    console.log('\n' + '='.repeat(60));
    console.log('Insertion Statistics');
    console.log('='.repeat(60));
    console.log(`Workflow Runs: ${this.stats.workflowRuns.toLocaleString()}`);
    console.log(`Step Runs:     ${this.stats.stepRuns.toLocaleString()}`);
    console.log(`Traces:        ${this.stats.traces.toLocaleString()}`);
    console.log(
      `Total Records: ${(this.stats.workflowRuns + this.stats.stepRuns + this.stats.traces).toLocaleString()}`
    );
    console.log(`Duration:      ${(this.stats.duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
}

export function estimateDataSize(stats: InsertStats): string {
  const avgWorkflowRunSize = 800;
  const avgStepRunSize = 500;
  const avgTraceSize = 400;

  const totalBytes =
    stats.workflowRuns * avgWorkflowRunSize + stats.stepRuns * avgStepRunSize + stats.traces * avgTraceSize;

  return formatBytes(totalBytes);
}
