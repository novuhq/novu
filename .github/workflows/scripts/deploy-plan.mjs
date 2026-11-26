#!/usr/bin/env node
// Builds the deploy plan for .github/workflows/deploy.yml: which GitHub
// environments are deployed in which wave, and what runs in each of them.
//
// Run by the `prepare-matrix` job. Inputs come from environment variables,
// outputs go to $GITHUB_OUTPUT and $GITHUB_STEP_SUMMARY.
// Tests: node --test .github/workflows/scripts/deploy-plan.test.mjs

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Dispatch option -> ordered waves of GitHub environments. A second wave only
// starts after the `prod-rollout-approval` environment is approved.
export const WAVES_BY_ENVIRONMENT = {
  staging: [['staging-eu']],
  'staging-sg': [['staging-apse1']],
  production: [['prod-us'], ['prod-eu', 'prod-apse1', 'prod-apse2', 'prod-ew2', 'prod-apne1', 'prod-apne2']],
  'production-us': [['prod-us']],
  'production-eu': [['prod-eu']],
  'production-sg': [['prod-apse1']],
  'production-au': [['prod-apse2']],
  'production-uk': [['prod-ew2']],
  'production-jp': [['prod-apne1']],
  'production-kr': [['prod-apne2']],
};

// Production images are built once in prod-us (us-east-1). ECR replication
// copies them to every other production region (cloud-infra, ecr.tf).
const PRODUCTION_BUILD_ENVIRONMENT = 'prod-us';

const ECS_SERVICES = ['api', 'worker', 'ws', 'webhook', 'inbound-mail'];
const NEW_RELIC_SERVICES = ['api', 'worker'];

// webhook and inbound-mail only have infrastructure in these environments.
const WEBHOOK_AND_INBOUND_MAIL_ENVIRONMENTS = ['staging-eu', 'prod-us', 'prod-eu'];

// ECS services that are not described by a repository variable.
const STATIC_ECS_SERVICES = {
  ws: {},
  webhook: { environments: WEBHOOK_AND_INBOUND_MAIL_ENVIRONMENTS },
  'inbound-mail': { environments: WEBHOOK_AND_INBOUND_MAIL_ENVIRONMENTS },
};

// Cloudflare Workers: GitHub environment -> Wrangler env.
const CLOUDFLARE_WORKERS = {
  // One Worker for staging and one for all of production.
  'thalamus-observer': { 'staging-eu': 'staging', 'prod-us': 'production' },
  // enterprise/workers/socket/wrangler.jsonc
  'socket-worker': { 'staging-eu': 'staging', 'prod-us': 'production-us', 'prod-eu': 'production-eu' },
  // apps/mcp-server/wrangler.jsonc
  'mcp-server': { 'staging-eu': 'staging', 'prod-us': 'us', 'prod-eu': 'eu' },
};

export const SERVICES = [...ECS_SERVICES, ...Object.keys(CLOUDFLARE_WORKERS)];

export class DeployPlanError extends Error {}

function ecsDefinitions(service, { apiServices, workerServices }) {
  if (service === 'api' || service === 'worker') {
    const definitions = service === 'api' ? apiServices : workerServices;

    return definitions.map((definition) => ({
      cluster_name: definition.cluster_name,
      container_name: definition.container_name,
      service_name: definition.service,
      task_name: definition.task_name,
      image: definition.image,
      environments: definition.environments,
    }));
  }

  return [
    {
      cluster_name: `${service}-cluster`,
      container_name: `${service}-container`,
      service_name: `${service}-service`,
      task_name: `${service}-task`,
      image: service,
      environments: STATIC_ECS_SERVICES[service].environments,
    },
  ];
}

// A definition without an `environments` list runs in every environment.
function runsIn(definition, environment) {
  return !Array.isArray(definition.environments) || definition.environments.includes(environment);
}

function emptyWave() {
  return {
    environments: [],
    migration_envs: [],
    deploy_matrix: [],
    nr_matrix: [],
    thalamus: [],
    socket_workers: [],
    mcp_servers: [],
  };
}

function hasWork(wave) {
  return (
    wave.deploy_matrix.length > 0 ||
    wave.thalamus.length > 0 ||
    wave.socket_workers.length > 0 ||
    wave.mcp_servers.length > 0
  );
}

const CLOUDFLARE_WAVE_KEYS = [
  ['thalamus-observer', 'thalamus'],
  ['socket-worker', 'socket_workers'],
  ['mcp-server', 'mcp_servers'],
];

// Adds the ECS targets of one service in one environment to the wave.
// Returns true when the service has at least one target there.
function planEcsService(wave, env, service, context) {
  const definitions = ecsDefinitions(service, context);
  const targets = definitions.filter((definition) => runsIn(definition, env));

  for (const definition of definitions) {
    if (!targets.includes(definition)) {
      context.skipped.push({ env, name: definition.service_name });
    }
  }

  for (const { environments: _environments, ...target } of targets) {
    wave.deploy_matrix.push({ env, ...target });
  }

  if (targets.length > 0 && NEW_RELIC_SERVICES.includes(service)) {
    wave.nr_matrix.push({ env, nr: service });
  }

  return targets.length > 0;
}

// Adds the Cloudflare Worker target of one environment to the wave.
// Returns true when the Worker has a Wrangler env for that environment.
function planCloudflareWorker(wave, env, worker, key, context) {
  const wranglerEnv = CLOUDFLARE_WORKERS[worker][env];
  if (!wranglerEnv) {
    context.skipped.push({ env, name: worker });

    return false;
  }

  wave[key].push({ wrangler_env: wranglerEnv, gh_environment: env });

  return true;
}

function planEnvironment(wave, env, context) {
  for (const service of context.selected.filter((name) => ECS_SERVICES.includes(name))) {
    if (planEcsService(wave, env, service, context)) {
      context.deployedSomewhere.add(service);
    }
  }

  const hasEcsTargets = wave.deploy_matrix.some((target) => target.env === env);
  if (hasEcsTargets) {
    wave.migration_envs.push(env);
  }

  let hasWorkerTargets = false;
  for (const [worker, key] of CLOUDFLARE_WAVE_KEYS) {
    if (context.selected.includes(worker) && planCloudflareWorker(wave, env, worker, key, context)) {
      context.deployedSomewhere.add(worker);
      hasWorkerTargets = true;
    }
  }

  if (hasEcsTargets || hasWorkerTargets) {
    wave.environments.push(env);
  }
}

/**
 * @param {object} options
 * @param {string} options.environment Dispatch option, a key of WAVES_BY_ENVIRONMENT.
 * @param {string[]} options.services Selected services, a subset of SERVICES.
 * @param {object[]} options.apiServices Parsed `vars.API_SERVICE`.
 * @param {object[]} options.workerServices Parsed `vars.WORKER_SERVICE`.
 */
export function buildDeployPlan({ environment, services, apiServices = [], workerServices = [] }) {
  const waveEnvironments = WAVES_BY_ENVIRONMENT[environment];
  if (!waveEnvironments) {
    throw new DeployPlanError(`Unknown environment "${environment}".`);
  }

  const selected = SERVICES.filter((service) => services.includes(service));
  if (selected.length === 0) {
    throw new DeployPlanError('At least one service must be selected for deployment.');
  }

  const allEnvironments = waveEnvironments.flat();
  const context = { selected, apiServices, workerServices, deployedSomewhere: new Set(), skipped: [] };

  const waves = waveEnvironments.map((environments) => {
    const wave = emptyWave();
    for (const env of environments) {
      planEnvironment(wave, env, context);
    }

    return wave;
  });

  // A selected service with nowhere to go is a mistake in the selection, e.g.
  // webhook on production-sg. Fail before anything is built or deployed.
  for (const service of selected) {
    if (!context.deployedSomewhere.has(service)) {
      throw new DeployPlanError(
        `${service} cannot be deployed with environment "${environment}": it does not run in ${allEnvironments.join(', ')}.`
      );
    }
  }

  const [wave1, wave2 = emptyWave()] = waves;
  const buildServices = selected.filter((service) => ECS_SERVICES.includes(service));

  return {
    wave_1: wave1,
    wave_2: wave2,
    staged: hasWork(wave2),
    build_environment: environment.startsWith('production') ? PRODUCTION_BUILD_ENVIRONMENT : allEnvironments[0],
    build_services: buildServices,
    has_ecs_services: buildServices.length > 0,
    first_environment: allEnvironments[0],
    skipped: context.skipped,
  };
}

function describeWave(wave) {
  const lines = [];

  for (const env of wave.environments) {
    const targets = [
      ...wave.deploy_matrix.filter((target) => target.env === env).map((target) => target.service_name),
      ...wave.thalamus.filter((target) => target.gh_environment === env).map(() => 'thalamus-observer'),
      ...wave.socket_workers.filter((target) => target.gh_environment === env).map(() => 'socket-worker'),
      ...wave.mcp_servers.filter((target) => target.gh_environment === env).map(() => 'mcp-server'),
    ];
    lines.push(`| \`${env}\` | ${targets.join(', ')} |`);
  }

  return lines;
}

export function renderSummary(plan) {
  const lines = ['## Deploy plan', ''];

  lines.push(plan.staged ? '### Wave 1 (no approval)' : '### Deploying', '', '| Environment | Targets |', '|---|---|');
  lines.push(...describeWave(plan.wave_1), '');

  if (plan.staged) {
    lines.push('### Wave 2 (after `prod-rollout-approval` is approved)', '', '| Environment | Targets |', '|---|---|');
    lines.push(...describeWave(plan.wave_2), '');
  }

  if (plan.has_ecs_services) {
    lines.push(`Images are built in \`${plan.build_environment}\`: ${plan.build_services.join(', ')}.`, '');
  }

  if (plan.skipped.length > 0) {
    lines.push('Not deployed because the service does not run there:', '');
    for (const { env, name } of plan.skipped) {
      lines.push(`- ${name} in \`${env}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function parseServiceVariable(name) {
  const raw = process.env[name];
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('expected a JSON array');
    }

    return parsed;
  } catch (error) {
    throw new DeployPlanError(`Repository variable ${name} is not valid: ${error.message}`);
  }
}

function main() {
  const services = SERVICES.filter(
    (service) => process.env[`INPUT_DEPLOY_${service.toUpperCase().replaceAll('-', '_')}`] === 'true'
  );

  let plan;
  try {
    plan = buildDeployPlan({
      environment: process.env.INPUT_ENVIRONMENT ?? '',
      services,
      apiServices: services.includes('api') ? parseServiceVariable('API_SERVICE') : [],
      workerServices: services.includes('worker') ? parseServiceVariable('WORKER_SERVICE') : [],
    });
  } catch (error) {
    if (error instanceof DeployPlanError) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const outputs = {
    wave_1: JSON.stringify(plan.wave_1),
    wave_2: JSON.stringify(plan.wave_2),
    staged: String(plan.staged),
    build_environment: plan.build_environment,
    build_services: JSON.stringify(plan.build_services),
    has_ecs_services: String(plan.has_ecs_services),
    first_environment: plan.first_environment,
  };

  const outputLines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${outputLines.join('\n')}\n`);
  }

  const summary = renderSummary(plan);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }

  console.log(summary);
  console.log(outputLines.join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
