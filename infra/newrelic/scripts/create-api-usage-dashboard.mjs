#!/usr/bin/env node

/**
 * Creates or updates the "API Usage Overview" New Relic dashboard via NerdGraph.
 *
 * Usage:
 *   NEW_RELIC_API_KEY=... node infra/newrelic/scripts/create-api-usage-dashboard.mjs
 *   NEW_RELIC_API_KEY=... node infra/newrelic/scripts/create-api-usage-dashboard.mjs --update <dashboard-guid>
 *
 * Uses the EU NerdGraph endpoint (one.eu.newrelic.com account).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_PATH = join(__dirname, '../dashboards/api-usage-overview.json');
const NERDGRAPH_URL = process.env.NEW_RELIC_NERDGRAPH_URL ?? 'https://api.eu.newrelic.com/graphql';

const CREATE_MUTATION = `
mutation CreateDashboard($accountId: Int!, $dashboard: DashboardInput!) {
  dashboardCreate(accountId: $accountId, dashboard: $dashboard) {
    entityResult {
      guid
      name
      permalink
    }
    errors {
      description
      type
    }
  }
}`;

const UPDATE_MUTATION = `
mutation UpdateDashboard($guid: EntityGuid!, $dashboard: DashboardInput!) {
  dashboardUpdate(guid: $guid, dashboard: $dashboard) {
    entityResult {
      guid
      name
      permalink
    }
    errors {
      description
      type
    }
  }
}`;

function loadDashboardDefinition() {
  const raw = JSON.parse(readFileSync(DASHBOARD_PATH, 'utf8'));
  const { accountId, variables, ...dashboard } = raw;

  const pages = dashboard.pages.map((page) => ({
    name: page.name,
    description: page.description ?? null,
    widgets: page.widgets.map((widget) => ({
      title: widget.title,
      visualization: widget.visualization,
      layout: widget.layout,
      linkedEntityGuids: widget.linkedEntityGuids ?? [],
      rawConfiguration: widget.rawConfiguration,
    })),
  }));

  const dashboardVariables = (variables ?? []).map((variable) => {
    if (variable.type === 'ENUM') {
      return {
        name: variable.name,
        title: variable.title,
        type: 'ENUM',
        isMultiSelection: false,
        replacementStrategy: 'DEFAULT',
        items: variable.items,
        defaultValues: [{ value: { string: variable.defaultValue } }],
        options: {
          ignoreTimeRange: false,
          hiddenOnVariablesBar: false,
        },
      };
    }

    return {
      name: variable.name,
      title: variable.title,
      type: 'STRING',
      isMultiSelection: false,
      replacementStrategy: 'DEFAULT',
      defaultValues: [{ value: { string: variable.defaultValue ?? '' } }],
      options: {
        ignoreTimeRange: false,
        hiddenOnVariablesBar: false,
      },
    };
  });

  return {
    accountId,
    dashboard: {
      name: dashboard.name,
      description: dashboard.description ?? null,
      permissions: dashboard.permissions ?? 'PUBLIC_READ_WRITE',
      pages,
      variables: dashboardVariables,
    },
  };
}

async function nerdgraphRequest(apiKey, query, variables) {
  const response = await fetch(NERDGRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`NerdGraph HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  if (body.errors?.length) {
    throw new Error(`NerdGraph errors: ${JSON.stringify(body.errors)}`);
  }

  return body.data;
}

async function main() {
  const apiKey = process.env.NEW_RELIC_API_KEY;

  if (!apiKey) {
    console.error('Missing NEW_RELIC_API_KEY environment variable.');
    console.error('Create a User API key at https://one.eu.newrelic.com/admin-portal/api-keys/home');
    process.exit(1);
  }

  const updateGuid = process.argv.includes('--update') ? process.argv[process.argv.indexOf('--update') + 1] : null;
  const { accountId, dashboard } = loadDashboardDefinition();

  const data = await nerdgraphRequest(
    apiKey,
    updateGuid ? UPDATE_MUTATION : CREATE_MUTATION,
    updateGuid ? { guid: updateGuid, dashboard } : { accountId, dashboard }
  );

  const result = updateGuid ? data.dashboardUpdate : data.dashboardCreate;

  if (result.errors?.length) {
    console.error('Dashboard operation failed:');
    for (const error of result.errors) {
      console.error(`  [${error.type}] ${error.description}`);
    }

    process.exit(1);
  }

  const entity = result.entityResult;

  console.log(`${updateGuid ? 'Updated' : 'Created'} dashboard: ${entity.name}`);
  console.log(`GUID: ${entity.guid}`);

  if (entity.permalink) {
    console.log(`URL: ${entity.permalink}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
