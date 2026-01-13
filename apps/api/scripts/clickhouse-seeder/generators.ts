import { randomBytes } from 'crypto';
import {
  DELIVERY_LIFECYCLE_STATUS_DISTRIBUTION,
  ENTERPRISE_HEAVY_DISTRIBUTION,
  ORGANIZATION_PROFILES,
  OrganizationProfile,
  SeederConfig,
  SingleEnvironmentConfig,
  STEP_RUN_STATUS_DISTRIBUTION,
  TRACE_EVENT_TYPES,
  WORKFLOW_RUN_STATUS_DISTRIBUTION,
  WORKFLOW_TEMPLATES,
  WorkflowTemplate,
} from './config';
import { addRandomJitter, generateRandomTimestampsForDay } from './time-distribution';

export interface Organization {
  id: string;
  name: string;
  profile: OrganizationProfile;
  environments: Environment[];
}

export interface Environment {
  id: string;
  name: string;
  organizationId: string;
  workflows: Workflow[];
  subscribers: Subscriber[];
}

export interface Workflow {
  id: string;
  name: string;
  triggerIdentifier: string;
  environmentId: string;
  organizationId: string;
  channels: string[];
  template: WorkflowTemplate;
}

export interface Subscriber {
  id: string;
  externalId: string;
  environmentId: string;
  organizationId: string;
}

export interface WorkflowRunRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
  workflow_run_id: string;
  workflow_id: string;
  workflow_name: string;
  organization_id: string;
  environment_id: string;
  user_id: string;
  subscriber_id: string;
  external_subscriber_id: string;
  status: string;
  trigger_identifier: string;
  transaction_id: string;
  channels: string;
  subscriber_to: string;
  payload: string;
  control_values: string | null;
  topics: string | null;
  is_digest: string;
  digested_workflow_run_id: string | null;
  expires_at: Date;
  delivery_lifecycle_status: string;
  delivery_lifecycle_detail: string;
  severity: string;
  critical: boolean;
  context_keys: string[];
}

export interface StepRunRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
  step_run_id: string;
  step_id: string;
  workflow_run_id: string;
  workflow_id: string;
  organization_id: string;
  environment_id: string;
  user_id: string;
  subscriber_id: string;
  external_subscriber_id: string;
  message_id: string | null;
  context_keys: string[];
  step_type: string;
  step_name: string;
  provider_id: string | null;
  status: string;
  deferred_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  transaction_id: string;
  expires_at: Date;
  digest: string | null;
  schedule_extensions_count: number;
}

export interface TraceRecord {
  id: string;
  created_at: Date;
  organization_id: string;
  environment_id: string;
  user_id: string;
  external_subscriber_id: string;
  subscriber_id: string;
  event_type: string;
  title: string;
  message: string | null;
  raw_data: string | null;
  status: string;
  entity_type: string;
  entity_id: string;
  expires_at: Date;
  step_run_type: string;
  workflow_run_identifier: string;
  workflow_id: string;
  provider_id: string | null;
}

function generateId(): string {
  return randomBytes(12).toString('hex');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedRandomChoice(distribution: Record<string, number>): string {
  const total = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;

  for (const [key, weight] of Object.entries(distribution)) {
    random -= weight;
    if (random <= 0) {
      return key;
    }
  }

  return Object.keys(distribution)[0];
}

export function generateOrganizations(config: SeederConfig): Organization[] {
  if (config.singleEnv?.enabled) {
    return generateSingleEnvironment(config.singleEnv);
  }

  const organizations: Organization[] = [];
  const distribution = ENTERPRISE_HEAVY_DISTRIBUTION;

  let orgCount = 0;

  for (const [profileType, count] of Object.entries(distribution)) {
    const scaledCount = Math.ceil(count * (config.organizations / 10));

    for (let i = 0; i < scaledCount && orgCount < config.organizations; i++) {
      const profile = ORGANIZATION_PROFILES[profileType];
      const orgId = generateId();

      const org: Organization = {
        id: orgId,
        name: `${profile.type.charAt(0).toUpperCase() + profile.type.slice(1)} Organization ${orgCount + 1}`,
        profile,
        environments: [],
      };

      const numEnvironments = randomInt(profile.environmentsMin, profile.environmentsMax);
      const envNames = ['Production', 'Staging', 'Development'];

      for (let e = 0; e < numEnvironments; e++) {
        const envId = generateId();
        const env: Environment = {
          id: envId,
          name: envNames[e] || `Environment ${e + 1}`,
          organizationId: orgId,
          workflows: [],
          subscribers: [],
        };

        const numWorkflows = randomInt(profile.workflowsMin, profile.workflowsMax);
        for (let w = 0; w < numWorkflows; w++) {
          const template = selectWorkflowTemplate();
          const workflowId = generateId();

          env.workflows.push({
            id: workflowId,
            name: `${template.name} ${w + 1}`,
            triggerIdentifier: `${template.type}_${w + 1}`.toLowerCase().replace(/\s+/g, '_'),
            environmentId: envId,
            organizationId: orgId,
            channels: template.channels,
            template,
          });
        }

        const numSubscribers = randomInt(profile.subscribersMin, profile.subscribersMax);
        for (let s = 0; s < numSubscribers; s++) {
          env.subscribers.push({
            id: generateId(),
            externalId: `user_${s + 1}`,
            environmentId: envId,
            organizationId: orgId,
          });
        }

        org.environments.push(env);
      }

      organizations.push(org);
      orgCount++;
    }
  }

  return organizations;
}

export function generateSingleEnvironment(singleEnvConfig: SingleEnvironmentConfig): Organization[] {
  const orgId = singleEnvConfig.organizationId || generateId();
  const envId = singleEnvConfig.environmentId || generateId();

  const customProfile: OrganizationProfile = {
    type: 'enterprise',
    runsPerDayMin: singleEnvConfig.runsPerDay,
    runsPerDayMax: singleEnvConfig.runsPerDay,
    workflowsMin: singleEnvConfig.workflows,
    workflowsMax: singleEnvConfig.workflows,
    subscribersMin: singleEnvConfig.subscribers,
    subscribersMax: singleEnvConfig.subscribers,
    environmentsMin: 1,
    environmentsMax: 1,
  };

  const env: Environment = {
    id: envId,
    name: 'Production',
    organizationId: orgId,
    workflows: [],
    subscribers: [],
  };

  for (let w = 0; w < singleEnvConfig.workflows; w++) {
    const template = selectWorkflowTemplate();
    const workflowId = singleEnvConfig.workflowId || generateId();

    env.workflows.push({
      id: workflowId,
      name: `${template.name} ${w + 1}`,
      triggerIdentifier: `${template.type}_${w + 1}`.toLowerCase().replace(/\s+/g, '_'),
      environmentId: envId,
      organizationId: orgId,
      channels: template.channels,
      template,
    });
  }

  for (let s = 0; s < singleEnvConfig.subscribers; s++) {
    const subscriberId = singleEnvConfig.subscriberId || generateId();
    env.subscribers.push({
      id: subscriberId,
      externalId: `user_${s + 1}`,
      environmentId: envId,
      organizationId: orgId,
    });
  }

  const org: Organization = {
    id: orgId,
    name: 'Single Environment Organization',
    profile: customProfile,
    environments: [env],
  };

  return [org];
}

function selectWorkflowTemplate(): WorkflowTemplate {
  const random = Math.random();
  let cumulative = 0;

  for (const template of WORKFLOW_TEMPLATES) {
    cumulative += template.weight;
    if (random <= cumulative) {
      return template;
    }
  }

  return WORKFLOW_TEMPLATES[0];
}

export function generateWorkflowRuns(organizations: Organization[], config: SeederConfig): WorkflowRunRecord[] {
  const allWorkflowRuns: WorkflowRunRecord[] = [];
  const startDate = config.startDate ?? new Date();

  for (const org of organizations) {
    for (const env of org.environments) {
      const runsPerDay = Math.floor(randomInt(org.profile.runsPerDayMin, org.profile.runsPerDayMax) * config.scale);

      for (let day = 0; day < config.days; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);

        const timestamps = generateRandomTimestampsForDay(currentDate, runsPerDay);

        for (const timestamp of timestamps) {
          const workflow = randomChoice(env.workflows);
          const subscriber = randomChoice(env.subscribers);

          const workflowRun = createWorkflowRunRecord(org, env, workflow, subscriber, timestamp);
          allWorkflowRuns.push(workflowRun);
        }
      }
    }
  }

  return allWorkflowRuns;
}

export interface GenerationProgress {
  phase: string;
  current: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

export interface DataBatch {
  workflowRuns: WorkflowRunRecord[];
  stepRuns: StepRunRecord[];
  traces: TraceRecord[];
}

export function estimateTotalWorkflowRuns(organizations: Organization[], config: SeederConfig): number {
  let total = 0;

  for (const org of organizations) {
    const envCount = org.environments.length;
    const avgRunsPerDay = Math.floor(((org.profile.runsPerDayMin + org.profile.runsPerDayMax) / 2) * config.scale);
    total += avgRunsPerDay * config.days * envCount;
  }

  return total;
}

export function* generateDataInBatches(
  organizations: Organization[],
  config: SeederConfig,
  batchSize: number,
  onProgress?: ProgressCallback
): Generator<DataBatch> {
  const estimatedTotal = estimateTotalWorkflowRuns(organizations, config);
  const startDate = config.startDate ?? new Date();

  let processedWorkflowRuns = 0;
  let pendingWorkflowRuns: WorkflowRunRecord[] = [];
  let pendingStepRuns: StepRunRecord[] = [];
  let pendingTraces: TraceRecord[] = [];

  for (const org of organizations) {
    for (const env of org.environments) {
      const runsPerDay = Math.floor(randomInt(org.profile.runsPerDayMin, org.profile.runsPerDayMax) * config.scale);

      for (let day = 0; day < config.days; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);

        const timestamps = generateRandomTimestampsForDay(currentDate, runsPerDay);

        for (const timestamp of timestamps) {
          const workflow = randomChoice(env.workflows);
          const subscriber = randomChoice(env.subscribers);

          const workflowRun = createWorkflowRunRecord(org, env, workflow, subscriber, timestamp);
          pendingWorkflowRuns.push(workflowRun);

          const stepRuns = generateStepRunsForWorkflow(workflowRun, workflow);
          pendingStepRuns.push(...stepRuns);

          for (const stepRun of stepRuns) {
            const traces = generateTracesForStepRun(stepRun);
            pendingTraces.push(...traces);
          }

          processedWorkflowRuns++;

          if (pendingWorkflowRuns.length >= batchSize) {
            if (onProgress) {
              onProgress({
                phase: 'Generating data',
                current: processedWorkflowRuns,
                total: estimatedTotal,
                percentage: Math.min(100, (processedWorkflowRuns / estimatedTotal) * 100),
              });
            }

            yield {
              workflowRuns: pendingWorkflowRuns,
              stepRuns: pendingStepRuns,
              traces: pendingTraces,
            };

            pendingWorkflowRuns = [];
            pendingStepRuns = [];
            pendingTraces = [];
          }
        }
      }
    }
  }

  if (pendingWorkflowRuns.length > 0) {
    if (onProgress) {
      onProgress({
        phase: 'Generating data',
        current: processedWorkflowRuns,
        total: estimatedTotal,
        percentage: 100,
      });
    }

    yield {
      workflowRuns: pendingWorkflowRuns,
      stepRuns: pendingStepRuns,
      traces: pendingTraces,
    };
  }
}

function generateStepRunsForWorkflow(workflowRun: WorkflowRunRecord, workflow: Workflow): StepRunRecord[] {
  const stepRuns: StepRunRecord[] = [];
  const channels = workflow.channels;

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const stepCreatedAt = new Date(workflowRun.created_at.getTime() + i * 100);

    const stepRun = createStepRunRecord(workflowRun, channel, stepCreatedAt, i);
    stepRuns.push(stepRun);
  }

  return stepRuns;
}

function generateTracesForStepRun(stepRun: StepRunRecord): TraceRecord[] {
  const traces: TraceRecord[] = [];
  const numTraces = randomInt(2, 5);

  for (let i = 0; i < numTraces; i++) {
    const traceCreatedAt = new Date(stepRun.created_at.getTime() + i * 50);

    const eventType = selectTraceEventType(i, numTraces, stepRun.status);
    const trace = createTraceRecord(stepRun, eventType, traceCreatedAt);
    traces.push(trace);
  }

  return traces;
}

function createWorkflowRunRecord(
  org: Organization,
  env: Environment,
  workflow: Workflow,
  subscriber: Subscriber,
  createdAt: Date
): WorkflowRunRecord {
  const workflowRunId = generateId();
  const transactionId = generateId();
  const status = weightedRandomChoice(WORKFLOW_RUN_STATUS_DISTRIBUTION);
  const deliveryStatus = weightedRandomChoice(DELIVERY_LIFECYCLE_STATUS_DISTRIBUTION);

  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 365);

  return {
    id: generateId(),
    created_at: createdAt,
    updated_at: addRandomJitter(createdAt, 1000),
    workflow_run_id: workflowRunId,
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    organization_id: org.id,
    environment_id: env.id,
    user_id: generateId(),
    subscriber_id: subscriber.id,
    external_subscriber_id: subscriber.externalId,
    status,
    trigger_identifier: workflow.triggerIdentifier,
    transaction_id: transactionId,
    channels: JSON.stringify(workflow.channels),
    subscriber_to: JSON.stringify({ email: `${subscriber.externalId}@example.com` }),
    payload: JSON.stringify({ data: 'sample payload' }),
    control_values: null,
    topics: null,
    is_digest: 'false',
    digested_workflow_run_id: null,
    expires_at: expiresAt,
    delivery_lifecycle_status: deliveryStatus,
    delivery_lifecycle_detail: '',
    severity: Math.random() > 0.9 ? 'high' : 'none',
    critical: Math.random() > 0.95,
    context_keys: [],
  };
}

export function generateStepRuns(workflowRuns: WorkflowRunRecord[], organizations: Organization[]): StepRunRecord[] {
  const allStepRuns: StepRunRecord[] = [];

  const orgMap = new Map<string, Organization>();
  for (const org of organizations) {
    orgMap.set(org.id, org);
  }

  const workflowMap = new Map<string, Workflow>();
  for (const org of organizations) {
    for (const env of org.environments) {
      for (const workflow of env.workflows) {
        workflowMap.set(workflow.id, workflow);
      }
    }
  }

  for (const workflowRun of workflowRuns) {
    const workflow = workflowMap.get(workflowRun.workflow_id);
    if (!workflow) continue;

    const channels = workflow.channels;

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const stepCreatedAt = new Date(workflowRun.created_at.getTime() + i * 100);

      const stepRun = createStepRunRecord(workflowRun, channel, stepCreatedAt, i);
      allStepRuns.push(stepRun);
    }
  }

  return allStepRuns;
}

function createStepRunRecord(
  workflowRun: WorkflowRunRecord,
  channel: string,
  createdAt: Date,
  _index: number
): StepRunRecord {
  const stepRunId = generateId();
  const status = weightedRandomChoice(STEP_RUN_STATUS_DISTRIBUTION);

  const providerMap: Record<string, string[]> = {
    email: ['sendgrid', 'ses', 'mailgun'],
    sms: ['twilio', 'sns'],
    push: ['fcm', 'apns'],
    in_app: ['novu'],
    chat: ['slack', 'discord'],
  };

  const providers = providerMap[channel] || ['novu'];
  const providerId = randomChoice(providers);

  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 365);

  return {
    id: generateId(),
    created_at: createdAt,
    updated_at: addRandomJitter(createdAt, 500),
    step_run_id: stepRunId,
    step_id: generateId(),
    workflow_run_id: workflowRun.workflow_run_id,
    workflow_id: workflowRun.workflow_id,
    organization_id: workflowRun.organization_id,
    environment_id: workflowRun.environment_id,
    user_id: workflowRun.user_id,
    subscriber_id: workflowRun.subscriber_id,
    external_subscriber_id: workflowRun.external_subscriber_id,
    message_id: status === 'completed' ? generateId() : null,
    context_keys: [],
    step_type: channel,
    step_name: `${channel} notification`,
    provider_id: providerId,
    status,
    deferred_ms: null,
    error_code: status === 'failed' ? 'PROVIDER_ERROR' : null,
    error_message: status === 'failed' ? 'Failed to send notification' : null,
    transaction_id: workflowRun.transaction_id,
    expires_at: expiresAt,
    digest: null,
    schedule_extensions_count: 0,
  };
}

export function generateTraces(stepRuns: StepRunRecord[]): TraceRecord[] {
  const allTraces: TraceRecord[] = [];

  for (const stepRun of stepRuns) {
    const numTraces = randomInt(2, 5);

    for (let i = 0; i < numTraces; i++) {
      const traceCreatedAt = new Date(stepRun.created_at.getTime() + i * 50);

      const eventType = selectTraceEventType(i, numTraces, stepRun.status);
      const trace = createTraceRecord(stepRun, eventType, traceCreatedAt);
      allTraces.push(trace);
    }
  }

  return allTraces;
}

function selectTraceEventType(index: number, total: number, stepStatus: string): string {
  if (index === 0) {
    return 'step_created';
  }

  if (index === 1) {
    if (stepStatus === 'completed') {
      return 'message_sent';
    }

    return 'step_queued';
  }

  if (index === 2) {
    return 'step_queued';
  }

  if (index === total - 1) {
    if (stepStatus === 'completed') {
      return 'step_completed';
    } else if (stepStatus === 'failed') {
      return 'step_canceled';
    } else if (stepStatus === 'canceled') {
      return 'step_canceled';
    }

    return 'step_completed';
  }

  const interactionEvents = TRACE_EVENT_TYPES.step_run;

  return randomChoice(interactionEvents);
}

function createTraceRecord(stepRun: StepRunRecord, eventType: string, createdAt: Date): TraceRecord {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 365);

  const statusMap: Record<string, string> = {
    step_completed: 'success',
    step_canceled: 'error',
    step_created: 'success',
    step_queued: 'success',
    message_sent: 'success',
    message_delivered: 'success',
    message_bounced: 'error',
    message_dropped: 'error',
    message_seen: 'success',
    message_read: 'success',
    message_clicked: 'success',
    message_archived: 'success',
  };

  return {
    id: generateId(),
    created_at: createdAt,
    organization_id: stepRun.organization_id,
    environment_id: stepRun.environment_id,
    user_id: stepRun.user_id,
    external_subscriber_id: stepRun.external_subscriber_id,
    subscriber_id: stepRun.subscriber_id,
    event_type: eventType,
    title: formatEventTitle(eventType),
    message: null,
    raw_data: null,
    status: statusMap[eventType] || 'success',
    entity_type: 'step_run',
    entity_id: stepRun.step_run_id,
    expires_at: expiresAt,
    step_run_type: stepRun.step_type,
    workflow_run_identifier: stepRun.workflow_run_id,
    workflow_id: stepRun.workflow_id,
    provider_id: stepRun.provider_id,
  };
}

function formatEventTitle(eventType: string): string {
  return eventType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
