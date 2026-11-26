import { FeatureFlagsKeysEnum } from '@novu/shared';

const FLAG = FeatureFlagsKeysEnum.IS_INTEGRATION_STORE_V_2_ENABLED;

/**
 * Sets `IS_INTEGRATION_STORE_V_2_ENABLED` for the enclosing suite, where the API masks secrets for the redesigned
 * integration store (on) or returns them decrypted for the previous one (off). Call it inside a `describe`.
 */
export function withIntegrationStoreV2Flag(enabled: boolean) {
  let previousValue: string | undefined;

  before(() => {
    previousValue = process.env[FLAG];
    process.env[FLAG] = String(enabled);
  });

  after(() => {
    if (previousValue === undefined) {
      delete process.env[FLAG];
    } else {
      process.env[FLAG] = previousValue;
    }
  });
}
