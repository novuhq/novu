import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', 'src', '.env') });

import { ClickHouseClient, createClient } from '@clickhouse/client';
import { parseCliArgs } from './clickhouse-seeder/config';
import {
  estimateTotalWorkflowRuns,
  GenerationProgress,
  generateDataInBatches,
  generateOrganizations,
  Organization,
} from './clickhouse-seeder/generators';
import { ClickHouseInserter, estimateDataSize } from './clickhouse-seeder/inserter';

function formatProgress(progress: GenerationProgress): string {
  const barLength = 30;
  const filledLength = Math.round((progress.percentage / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  return `  [${bar}] ${progress.percentage.toFixed(1)}% (${progress.current.toLocaleString()}/${progress.total.toLocaleString()})`;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('ClickHouse Data Seeding Script');
  console.log('='.repeat(60) + '\n');

  const config = parseCliArgs();

  if (config.singleEnv?.enabled) {
    console.log('Mode: Single Environment');
    console.log('-'.repeat(60));
    console.log(`  Organization ID: ${config.singleEnv.organizationId || '(auto-generated)'}`);
    console.log(`  Environment ID:  ${config.singleEnv.environmentId || '(auto-generated)'}`);
    if (config.singleEnv.workflowId) {
      console.log(`  Workflow ID:     ${config.singleEnv.workflowId}`);
    } else {
      console.log(`  Workflows:       ${config.singleEnv.workflows}`);
    }
    if (config.singleEnv.subscriberId) {
      console.log(`  Subscriber ID:   ${config.singleEnv.subscriberId}`);
    } else {
      console.log(`  Subscribers:     ${config.singleEnv.subscribers.toLocaleString()}`);
    }
    console.log(`  Runs/Day:        ${config.singleEnv.runsPerDay.toLocaleString()}`);
    console.log(`  Days:            ${config.days}`);
    console.log(`  Batch Size:      ${config.batchSize.toLocaleString()}`);
    console.log(`  Start Date:      ${config.startDate?.toISOString().split('T')[0]}`);
  } else {
    console.log('Mode: Multi-Organization');
    console.log('-'.repeat(60));
    console.log(`  Organizations: ${config.organizations}`);
    console.log(`  Days:          ${config.days}`);
    console.log(`  Scale:         ${config.scale}x`);
    console.log(`  Batch Size:    ${config.batchSize.toLocaleString()}`);
    console.log(`  Start Date:    ${config.startDate?.toISOString().split('T')[0]}`);
  }
  console.log('');

  if (!process.env.CLICK_HOUSE_URL || !process.env.CLICK_HOUSE_DATABASE) {
    console.error('Error: ClickHouse environment variables not set');
    console.error('Required: CLICK_HOUSE_URL, CLICK_HOUSE_DATABASE');
    process.exit(1);
  }

  const client: ClickHouseClient = createClient({
    url: process.env.CLICK_HOUSE_URL,
    username: process.env.CLICK_HOUSE_USER,
    password: process.env.CLICK_HOUSE_PASSWORD,
    database: process.env.CLICK_HOUSE_DATABASE,
  });

  try {
    console.log('Testing ClickHouse connection...');
    await client.ping();
    console.log('✓ Connected to ClickHouse\n');

    console.log('Phase 1: Generating Organizations and Structure');
    console.log('-'.repeat(60));
    const organizations = generateOrganizations(config);

    const totalEnvironments = organizations.reduce((sum, org) => sum + org.environments.length, 0);
    const totalWorkflows = organizations.reduce(
      (sum, org) => sum + org.environments.reduce((envSum, env) => envSum + env.workflows.length, 0),
      0
    );
    const totalSubscribers = organizations.reduce(
      (sum, org) => sum + org.environments.reduce((envSum, env) => envSum + env.subscribers.length, 0),
      0
    );

    if (config.singleEnv?.enabled) {
      const org = organizations[0];
      const env = org.environments[0];
      console.log(`✓ Generated single environment`);
      console.log(`  Organization ID: ${org.id}`);
      console.log(`  Environment ID:  ${env.id}`);
      console.log(`  Workflows:       ${totalWorkflows}`);
      console.log(`  Subscribers:     ${totalSubscribers.toLocaleString()}`);
    } else {
      console.log(`✓ Generated ${organizations.length} organizations`);
      console.log(`  Environments: ${totalEnvironments}`);
      console.log(`  Workflows:    ${totalWorkflows}`);
      console.log(`  Subscribers:  ${totalSubscribers.toLocaleString()}`);
      printOrganizationBreakdown(organizations);
    }

    const estimatedWorkflowRuns = estimateTotalWorkflowRuns(organizations, config);
    console.log(`\nEstimated records to generate:`);
    console.log(`  Workflow runs: ~${estimatedWorkflowRuns.toLocaleString()}`);
    console.log(`  Step runs:     ~${(estimatedWorkflowRuns * 2).toLocaleString()} (avg 2 steps/workflow)`);
    console.log(
      `  Traces:        ~${Math.floor(estimatedWorkflowRuns * 2 * 3.5).toLocaleString()} (avg 3.5 traces/step)`
    );

    console.log('\nPhase 2: Generating and Inserting Data (Streaming)');
    console.log('-'.repeat(60));

    const inserter = new ClickHouseInserter(client, config.batchSize);
    const startTime = Date.now();

    let lastProgressLog = 0;
    const progressLogInterval = 5;
    let batchCount = 0;

    const progressCallback = (progress: GenerationProgress) => {
      const now = progress.percentage;
      if (now - lastProgressLog >= progressLogInterval || now >= 100) {
        process.stdout.write('\r' + formatProgress(progress));
        lastProgressLog = Math.floor(now / progressLogInterval) * progressLogInterval;
      }
    };

    const dataGenerator = generateDataInBatches(organizations, config, config.batchSize, progressCallback);

    for (const batch of dataGenerator) {
      batchCount++;

      await Promise.all([
        inserter.insertWorkflowRunsSilent(batch.workflowRuns),
        inserter.insertStepRunsSilent(batch.stepRuns),
        inserter.insertTracesSilent(batch.traces),
      ]);
    }

    console.log('\n');

    const stats = inserter.getStats();
    const totalDuration = Date.now() - startTime;

    console.log('✓ Data generation and insertion complete');
    console.log(`  Processed ${batchCount} batches in ${(totalDuration / 1000).toFixed(2)}s`);

    inserter.printStats();

    console.log('Additional Information:');
    console.log(`  Estimated Size: ${estimateDataSize(stats)}`);
    const totalRecords = stats.workflowRuns + stats.stepRuns + stats.traces;
    console.log(`  Records/Second: ${(totalRecords / (totalDuration / 1000)).toFixed(0)}`);

    console.log('\n✓ Data seeding completed successfully!');
    console.log('\nNote: Materialized views will automatically populate aggregation tables:');
    console.log('      - trace_rollup: Pre-aggregated counts by date/event_type/workflow/subscriber/provider');
    console.log('      - delivery_trend_counts: Pre-aggregated delivery counts by step_type');
    console.log(
      '      Query trace_rollup for optimized analytics (message counts, active subscribers, interactions).\n'
    );
  } catch (error) {
    console.error('\n✗ Error during seeding:', error);
    throw error;
  } finally {
    await client.close();
  }
}

function printOrganizationBreakdown(organizations: Organization[]) {
  const breakdown = {
    enterprise: 0,
    large: 0,
    medium: 0,
  };

  for (const org of organizations) {
    breakdown[org.profile.type]++;
  }

  console.log('\n  Organization Breakdown:');
  console.log(`    Enterprise: ${breakdown.enterprise}`);
  console.log(`    Large:      ${breakdown.large}`);
  console.log(`    Medium:     ${breakdown.medium}`);
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main };
