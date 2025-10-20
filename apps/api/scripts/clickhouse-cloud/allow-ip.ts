#!/usr/bin/env node

import * as fs from 'fs';

async function getCurrentIpAddress(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      throw new Error(`Failed to fetch IP: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { ip: string };

    return data.ip;
  } catch (error) {
    console.error('⚠️  Error fetching current IP address:', error);
    throw error;
  }
}

async function addIpToAllowlist(
  orgId: string,
  serviceId: string,
  apiKeyId: string,
  apiKeySecret: string,
  ipAddress: string
): Promise<void> {
  const url = `https://api.clickhouse.cloud/v1/organizations/${orgId}/services/${serviceId}`;
  const timestamp = new Date().toISOString();
  const source = `${ipAddress}/32`;

  const payload = {
    ipAccessList: {
      add: [
        {
          source,
          description: `GitHub Actions Runner - Added at ${timestamp}`,
        },
      ],
    },
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKeyId}:${apiKeySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add IP to allowlist: ${response.status} ${response.statusText}\n${errorText}`);
    }

    console.log(`✅ Successfully added IP ${source} to ClickHouse Cloud allowlist`);
  } catch (error) {
    console.error('⚠️  Error adding IP to allowlist:', error);
    throw error;
  }
}

function writeGitHubOutput(key: string, value: string): void {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    try {
      fs.appendFileSync(githubOutput, `${key}=${value}\n`);
      console.log(`📝 Wrote ${key}=${value} to GITHUB_OUTPUT`);
    } catch (error) {
      console.error('⚠️  Failed to write to GITHUB_OUTPUT:', error);
    }
  }
}

async function main() {
  const orgId = process.env.CLICKHOUSE_CLOUD_ORG_ID;
  const serviceId = process.env.CLICKHOUSE_CLOUD_SERVICE_ID;
  const apiKeyId = process.env.CLICKHOUSE_CLOUD_API_KEY_ID;
  const apiKeySecret = process.env.CLICKHOUSE_CLOUD_API_KEY_SECRET;

  if (!orgId || !serviceId || !apiKeyId || !apiKeySecret) {
    console.error('❌ Missing required environment variables:');
    if (!orgId) console.error('  - CLICKHOUSE_CLOUD_ORG_ID');
    if (!serviceId) console.error('  - CLICKHOUSE_CLOUD_SERVICE_ID');
    if (!apiKeyId) console.error('  - CLICKHOUSE_CLOUD_API_KEY_ID');
    if (!apiKeySecret) console.error('  - CLICKHOUSE_CLOUD_API_KEY_SECRET');
    process.exit(1);
  }

  try {
    console.log('🔍 Fetching current runner IP address...');
    const ipAddress = await getCurrentIpAddress();
    console.log(`📍 Current IP: ${ipAddress}`);

    console.log(`➕ Adding IP ${ipAddress}/32 to ClickHouse Cloud allowlist...`);
    await addIpToAllowlist(orgId, serviceId, apiKeyId, apiKeySecret, ipAddress);

    writeGitHubOutput('runner_ip', ipAddress);

    console.log('✨ IP allowlist operation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Failed to allowlist IP:', error);
    process.exit(1);
  }
}

main();
