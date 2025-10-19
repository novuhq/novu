#!/usr/bin/env node

async function removeIpFromAllowlist(
  orgId: string,
  serviceId: string,
  apiKeyId: string,
  apiKeySecret: string,
  ipAddress: string
): Promise<void> {
  const url = `https://api.clickhouse.cloud/v1/organizations/${orgId}/services/${serviceId}`;
  const source = `${ipAddress}/32`;

  const payload = {
    ipAccessList: {
      remove: [
        {
          source,
          description: '',
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
      throw new Error(`Failed to remove IP from allowlist: ${response.status} ${response.statusText}\n${errorText}`);
    }

    console.log(`✅ Successfully removed IP ${source} from ClickHouse Cloud allowlist`);
  } catch (error) {
    console.error('⚠️  Error removing IP from allowlist:', error);
    throw error;
  }
}

async function main() {
  const orgId = process.env.CLICKHOUSE_CLOUD_ORG_ID;
  const serviceId = process.env.CLICKHOUSE_CLOUD_SERVICE_ID;
  const apiKeyId = process.env.CLICKHOUSE_CLOUD_API_KEY_ID;
  const apiKeySecret = process.env.CLICKHOUSE_CLOUD_API_KEY_SECRET;
  const ipAddress = process.argv[2];

  if (!orgId || !serviceId || !apiKeyId || !apiKeySecret) {
    console.error('❌ Missing required environment variables:');
    if (!orgId) console.error('  - CLICKHOUSE_CLOUD_ORG_ID');
    if (!serviceId) console.error('  - CLICKHOUSE_CLOUD_SERVICE_ID');
    if (!apiKeyId) console.error('  - CLICKHOUSE_CLOUD_API_KEY_ID');
    if (!apiKeySecret) console.error('  - CLICKHOUSE_CLOUD_API_KEY_SECRET');
    process.exit(1);
  }

  if (!ipAddress) {
    console.error('❌ Usage: remove-ip.ts <ip-address>');
    console.error('Example: remove-ip.ts 203.0.113.42');
    process.exit(1);
  }

  try {
    console.log(`🗑️  Removing IP ${ipAddress}/32 from ClickHouse Cloud allowlist...`);
    await removeIpFromAllowlist(orgId, serviceId, apiKeyId, apiKeySecret, ipAddress);
    console.log('✨ IP removal completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Failed to remove IP from allowlist:', error);
    process.exit(1);
  }
}

main();
