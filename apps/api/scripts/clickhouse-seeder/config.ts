export interface SingleEnvironmentConfig {
  enabled: boolean;
  organizationId?: string;
  environmentId?: string;
  workflows: number;
  subscribers: number;
  runsPerDay: number;
  workflowId?: string;
  subscriberId?: string;
}

export interface SeederConfig {
  organizations: number;
  days: number;
  scale: number;
  batchSize: number;
  startDate?: Date;
  singleEnv?: SingleEnvironmentConfig;
}

export interface OrganizationProfile {
  type: 'enterprise' | 'large' | 'medium';
  runsPerDayMin: number;
  runsPerDayMax: number;
  workflowsMin: number;
  workflowsMax: number;
  subscribersMin: number;
  subscribersMax: number;
  environmentsMin: number;
  environmentsMax: number;
}

export const ORGANIZATION_PROFILES: Record<string, OrganizationProfile> = {
  enterprise: {
    type: 'enterprise',
    runsPerDayMin: 20000,
    runsPerDayMax: 50000,
    workflowsMin: 8,
    workflowsMax: 15,
    subscribersMin: 5000,
    subscribersMax: 10000,
    environmentsMin: 2,
    environmentsMax: 3,
  },
  large: {
    type: 'large',
    runsPerDayMin: 5000,
    runsPerDayMax: 15000,
    workflowsMin: 5,
    workflowsMax: 10,
    subscribersMin: 1000,
    subscribersMax: 5000,
    environmentsMin: 2,
    environmentsMax: 3,
  },
  medium: {
    type: 'medium',
    runsPerDayMin: 500,
    runsPerDayMax: 2000,
    workflowsMin: 3,
    workflowsMax: 5,
    subscribersMin: 100,
    subscribersMax: 500,
    environmentsMin: 1,
    environmentsMax: 2,
  },
};

export const ENTERPRISE_HEAVY_DISTRIBUTION = {
  enterprise: 3,
  large: 4,
  medium: 3,
};

export interface WorkflowTemplate {
  type: 'transactional' | 'marketing' | 'alerts' | 'multichannel';
  name: string;
  channels: string[];
  weight: number;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { type: 'transactional', name: 'Order Confirmation', channels: ['email', 'in_app'], weight: 0.4 },
  { type: 'marketing', name: 'Newsletter', channels: ['email'], weight: 0.25 },
  { type: 'alerts', name: 'Critical Alert', channels: ['push', 'sms'], weight: 0.15 },
  { type: 'multichannel', name: 'Campaign Update', channels: ['email', 'in_app', 'push'], weight: 0.2 },
];

export const WORKFLOW_RUN_STATUS_DISTRIBUTION = {
  completed: 0.85,
  processing: 0.05,
  error: 0.1,
};

export const STEP_RUN_STATUS_DISTRIBUTION = {
  completed: 0.88,
  failed: 0.07,
  skipped: 0.03,
  delayed: 0.02,
};

export const DELIVERY_LIFECYCLE_STATUS_DISTRIBUTION = {
  delivered: 0.7,
  sent: 0.15,
  errored: 0.08,
  skipped: 0.04,
  canceled: 0.02,
  merged: 0.01,
};

export const TRACE_EVENT_TYPES = {
  step_run: ['message_seen', 'message_read', 'message_clicked', 'message_archived'],
  execution: ['step_created', 'step_queued', 'step_completed', 'step_canceled'],
  delivery: ['message_sent', 'message_delivered', 'message_bounced', 'message_dropped'],
};

export const DEFAULT_SINGLE_ENV_CONFIG: SingleEnvironmentConfig = {
  enabled: false,
  workflows: 5,
  subscribers: 1000,
  runsPerDay: 5000,
};

export const DEFAULT_CONFIG: SeederConfig = {
  organizations: 10,
  days: 30,
  scale: 1,
  batchSize: 10000,
};

export function parseCliArgs(): SeederConfig {
  const args = process.argv.slice(2);
  const config: SeederConfig = { ...DEFAULT_CONFIG };
  const singleEnvConfig: SingleEnvironmentConfig = { ...DEFAULT_SINGLE_ENV_CONFIG };

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let value = args[i + 1];

    if (arg.includes('=')) {
      const [key, val] = arg.split('=');
      arg = key;
      value = val;
    }

    switch (arg) {
      case '--single-env':
        singleEnvConfig.enabled = true;
        break;
      case '--org-id':
        singleEnvConfig.organizationId = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--env-id':
        singleEnvConfig.environmentId = value;
        if (!args[i].includes('=')) i++;
        break;
      case '--workflows':
      case '-w':
        singleEnvConfig.workflows = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--subscribers':
        singleEnvConfig.subscribers = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--runs-per-day':
      case '-r':
        singleEnvConfig.runsPerDay = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--workflow':
        singleEnvConfig.workflowId = value;
        singleEnvConfig.workflows = 1;
        if (!args[i].includes('=')) i++;
        break;
      case '--subscriber':
        singleEnvConfig.subscriberId = value;
        singleEnvConfig.subscribers = 1;
        if (!args[i].includes('=')) i++;
        break;
      case '--organizations':
      case '-o':
        config.organizations = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--days':
      case '-d':
        config.days = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--scale':
      case '-s':
        config.scale = parseFloat(value);
        if (!args[i].includes('=')) i++;
        break;
      case '--batch-size':
      case '-b':
        config.batchSize = parseInt(value, 10);
        if (!args[i].includes('=')) i++;
        break;
      case '--start-date':
        config.startDate = new Date(value);
        if (!args[i].includes('=')) i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!config.startDate) {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    config.startDate = new Date(now.getTime() - config.days * msPerDay);
  }

  if (singleEnvConfig.enabled) {
    config.singleEnv = singleEnvConfig;
  }

  return config;
}

function printHelp() {
  console.log(`
ClickHouse Data Seeding Script

Usage: pnpm seed:clickhouse [options]

Multi-Organization Mode (default):
  -o, --organizations <num>   Number of organizations to create (default: 10)
  -s, --scale <num>           Multiplier for data volume (default: 1)

Single Environment Mode:
  --single-env                Enable single environment mode
  --org-id <id>               Organization ID (optional, auto-generated if not provided)
  --env-id <id>               Environment ID (optional, auto-generated if not provided)
  -w, --workflows <num>       Number of workflows (default: 5)
  --subscribers <num>         Number of subscribers (default: 1000)
  -r, --runs-per-day <num>    Workflow runs per day (default: 5000)
  --workflow <id>             Specific workflow ID to use (sets workflows to 1)
  --subscriber <id>           Specific subscriber ID to use (sets subscribers to 1)

Common Options:
  -d, --days <num>            Days of data to generate (default: 30)
  -b, --batch-size <num>      Records per ClickHouse insert batch (default: 10000)
  --start-date <date>         Start date for data generation (default: first day of last month)
  -h, --help                  Show this help message

Examples:
  # Multi-org mode (default)
  pnpm seed:clickhouse
  pnpm seed:clickhouse --scale=10 --organizations=50
  pnpm seed:clickhouse --days=7 --scale=5

  # Single environment mode
  pnpm seed:clickhouse --single-env --days=7 --runs-per-day=10000
  pnpm seed:clickhouse --single-env --org-id=abc123 --env-id=def456 --workflows=10 --subscribers=5000
  pnpm seed:clickhouse --single-env --workflow=693ab23238cf527f6dc645d6 --subscriber=69395055051b1b19ff9e1b4c --org-id=69395056051b1b19ff9e1b52 --env-id=69395056c66fd6620f4521ba
  `);
}
