// node --test .github/workflows/scripts/deploy-plan.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDeployPlan, DeployPlanError, renderSummary, SERVICES, WAVES_BY_ENVIRONMENT } from './deploy-plan.mjs';

const EVERY_ENVIRONMENT = [
  'staging-eu',
  'staging-apse1',
  'prod-us',
  'prod-eu',
  'prod-apse1',
  'prod-apse2',
  'prod-ew2',
  'prod-apne1',
  'prod-apne2',
];
const REMAINING_PRODUCTION = ['prod-eu', 'prod-apse1', 'prod-apse2', 'prod-ew2', 'prod-apne1', 'prod-apne2'];

// Same shape as the API_SERVICE and WORKER_SERVICE repository variables.
const apiServices = [
  {
    cluster_name: 'api-cluster',
    container_name: 'api-container',
    service: 'api-service',
    task_name: 'api-task',
    image: 'api',
    environments: EVERY_ENVIRONMENT,
  },
  {
    cluster_name: 'api-cluster',
    container_name: 'api-internal-container',
    service: 'api-internal-service',
    task_name: 'api-internal-task',
    image: 'api',
    environments: EVERY_ENVIRONMENT,
  },
];

function workerService(name, environments) {
  return {
    cluster_name: 'worker-cluster',
    container_name: 'worker-container',
    service: `worker-service-${name}`,
    task_name: `worker-task-${name}`,
    image: 'worker',
    environments,
  };
}

const workerServices = [
  workerService('inbound-parse-mail', ['staging-eu', 'prod-us', 'prod-eu']),
  workerService('metric-active-jobs', ['prod-us', 'prod-eu']),
  workerService('process-subscriber', EVERY_ENVIRONMENT),
  workerService('standard', EVERY_ENVIRONMENT),
  workerService('trigger-handler', EVERY_ENVIRONMENT),
];

function plan(environment, services) {
  return buildDeployPlan({ environment, services, apiServices, workerServices });
}

function deployed(wave, env) {
  return wave.deploy_matrix.filter((target) => target.env === env).map((target) => target.service_name);
}

test('production deploys prod-us first and every other region in the second wave', () => {
  const result = plan('production', ['api', 'worker']);

  assert.equal(result.staged, true);
  assert.deepEqual(result.wave_1.environments, ['prod-us']);
  assert.deepEqual(result.wave_2.environments, REMAINING_PRODUCTION);
  assert.deepEqual(result.wave_1.migration_envs, ['prod-us']);
  assert.deepEqual(result.wave_2.migration_envs, REMAINING_PRODUCTION);
  assert.ok(result.wave_1.deploy_matrix.every((target) => target.env === 'prod-us'));
  assert.ok(result.wave_2.deploy_matrix.every((target) => target.env !== 'prod-us'));
});

test('production builds once, in prod-us', () => {
  const result = plan('production', ['api', 'worker', 'ws', 'webhook']);

  assert.equal(result.build_environment, 'prod-us');
  assert.deepEqual(result.build_services, ['api', 'worker', 'ws', 'webhook']);
  assert.equal(result.first_environment, 'prod-us');
});

test('a service is only deployed to the environments it lists', () => {
  const result = plan('production', ['api', 'worker']);

  assert.deepEqual(deployed(result.wave_1, 'prod-us'), [
    'api-service',
    'api-internal-service',
    'worker-service-inbound-parse-mail',
    'worker-service-metric-active-jobs',
    'worker-service-process-subscriber',
    'worker-service-standard',
    'worker-service-trigger-handler',
  ]);
  assert.equal(deployed(result.wave_2, 'prod-eu').length, 7);
  assert.deepEqual(deployed(result.wave_2, 'prod-apse1'), [
    'api-service',
    'api-internal-service',
    'worker-service-process-subscriber',
    'worker-service-standard',
    'worker-service-trigger-handler',
  ]);
  assert.ok(
    result.skipped.some((entry) => entry.env === 'prod-apne2' && entry.name === 'worker-service-metric-active-jobs')
  );
});

test('production skips webhook and inbound-mail outside US and EU instead of failing', () => {
  const result = plan('production', ['ws', 'webhook', 'inbound-mail']);

  assert.deepEqual(deployed(result.wave_1, 'prod-us'), ['ws-service', 'webhook-service', 'inbound-mail-service']);
  assert.deepEqual(deployed(result.wave_2, 'prod-eu'), ['ws-service', 'webhook-service', 'inbound-mail-service']);
  for (const env of ['prod-apse1', 'prod-apse2', 'prod-ew2', 'prod-apne1', 'prod-apne2']) {
    assert.deepEqual(deployed(result.wave_2, env), ['ws-service']);
  }
});

test('production places each Cloudflare Worker in the wave of its region', () => {
  const result = plan('production', ['thalamus-observer', 'socket-worker', 'mcp-server']);

  assert.deepEqual(result.wave_1.thalamus, [{ wrangler_env: 'production', gh_environment: 'prod-us' }]);
  assert.deepEqual(result.wave_1.socket_workers, [{ wrangler_env: 'production-us', gh_environment: 'prod-us' }]);
  assert.deepEqual(result.wave_1.mcp_servers, [{ wrangler_env: 'us', gh_environment: 'prod-us' }]);
  assert.deepEqual(result.wave_2.thalamus, []);
  assert.deepEqual(result.wave_2.socket_workers, [{ wrangler_env: 'production-eu', gh_environment: 'prod-eu' }]);
  assert.deepEqual(result.wave_2.mcp_servers, [{ wrangler_env: 'eu', gh_environment: 'prod-eu' }]);
  assert.deepEqual(result.wave_2.environments, ['prod-eu']);
  assert.equal(result.has_ecs_services, false);
  assert.deepEqual(result.wave_1.migration_envs, []);
});

test('production with nothing for the other regions needs no approval', () => {
  const result = plan('production', ['thalamus-observer']);

  assert.equal(result.staged, false);
  assert.deepEqual(result.wave_2.environments, []);
});

test('New Relic markers follow the api and worker deploys', () => {
  const result = plan('production', ['api', 'ws']);

  assert.deepEqual(result.wave_1.nr_matrix, [{ env: 'prod-us', nr: 'api' }]);
  assert.deepEqual(
    result.wave_2.nr_matrix,
    REMAINING_PRODUCTION.map((env) => ({ env, nr: 'api' }))
  );
  assert.deepEqual(plan('production-us', ['ws']).wave_1.nr_matrix, []);
});

test('staging is a single wave built in staging-eu', () => {
  const result = plan('staging', SERVICES);

  assert.equal(result.staged, false);
  assert.equal(result.build_environment, 'staging-eu');
  assert.deepEqual(result.wave_1.environments, ['staging-eu']);
  assert.deepEqual(deployed(result.wave_1, 'staging-eu'), [
    'api-service',
    'api-internal-service',
    'worker-service-inbound-parse-mail',
    'worker-service-process-subscriber',
    'worker-service-standard',
    'worker-service-trigger-handler',
    'ws-service',
    'webhook-service',
    'inbound-mail-service',
  ]);
  assert.deepEqual(result.wave_1.thalamus, [{ wrangler_env: 'staging', gh_environment: 'staging-eu' }]);
  assert.deepEqual(result.wave_1.socket_workers, [{ wrangler_env: 'staging', gh_environment: 'staging-eu' }]);
  assert.deepEqual(result.wave_1.mcp_servers, [{ wrangler_env: 'staging', gh_environment: 'staging-eu' }]);
});

test('staging-sg builds in staging-apse1', () => {
  const result = plan('staging-sg', ['api', 'worker', 'ws']);

  assert.equal(result.build_environment, 'staging-apse1');
  assert.deepEqual(deployed(result.wave_1, 'staging-apse1'), [
    'api-service',
    'api-internal-service',
    'worker-service-process-subscriber',
    'worker-service-standard',
    'worker-service-trigger-handler',
    'ws-service',
  ]);
});

test('a single production region is one wave, built in prod-us', () => {
  for (const [environment, [[env]]] of Object.entries(WAVES_BY_ENVIRONMENT)) {
    if (!environment.startsWith('production-')) {
      continue;
    }

    const result = plan(environment, ['api', 'worker', 'ws']);

    assert.equal(result.staged, false, environment);
    assert.equal(result.build_environment, 'prod-us', environment);
    assert.equal(result.first_environment, env, environment);
    assert.deepEqual(result.wave_1.environments, [env], environment);
    assert.deepEqual(result.wave_1.migration_envs, [env], environment);
    assert.deepEqual(result.wave_2.deploy_matrix, [], environment);
  }
});

test('a deploy target carries exactly the fields the deploy job reads', () => {
  const [target] = plan('production-us', ['ws']).wave_1.deploy_matrix;

  assert.deepEqual(target, {
    env: 'prod-us',
    cluster_name: 'ws-cluster',
    container_name: 'ws-container',
    service_name: 'ws-service',
    task_name: 'ws-task',
    image: 'ws',
  });
});

test('a service without an environments list runs everywhere', () => {
  const result = buildDeployPlan({
    environment: 'production-kr',
    services: ['api'],
    apiServices: [{ cluster_name: 'c', container_name: 'k', service: 's', task_name: 't', image: 'api' }],
  });

  assert.deepEqual(deployed(result.wave_1, 'prod-apne2'), ['s']);
});

test('selecting a service the region does not have is an error', () => {
  for (const [environment, services] of [
    ['production-sg', ['api', 'webhook']],
    ['staging-sg', ['inbound-mail']],
    ['production-eu', ['thalamus-observer']],
    ['production-au', ['socket-worker']],
    ['production-uk', ['mcp-server']],
    ['production-jp', ['worker']],
  ]) {
    assert.throws(
      () =>
        buildDeployPlan({
          environment,
          services,
          apiServices,
          workerServices: [workerService('metric-active-jobs', ['prod-us', 'prod-eu'])],
        }),
      DeployPlanError,
      `${environment} ${services.join(',')}`
    );
  }
});

test('no service or an unknown environment is an error', () => {
  assert.throws(() => plan('production', []), /At least one service/);
  assert.throws(() => plan('production-us-and-eu', ['api']), /Unknown environment/);
});

test('the summary names both waves and the approval environment', () => {
  const summary = renderSummary(plan('production', ['api', 'webhook']));

  assert.match(summary, /Wave 1 \(no approval\)/);
  assert.match(summary, /prod-rollout-approval/);
  assert.match(summary, /webhook-service in `prod-apse1`/);
  assert.doesNotMatch(renderSummary(plan('staging', ['api'])), /Wave 2/);
});
