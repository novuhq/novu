import { describe, expect, it } from 'vitest';
import {
  OrganizationProductTypeEnum,
  resolveOrganizationProductType,
  tryReadOrganizationProductType,
} from './organization';

describe('resolveOrganizationProductType', () => {
  it('returns CONNECT when metadata declares the Connect product', () => {
    expect(resolveOrganizationProductType({ productType: 'connect' })).toBe(OrganizationProductTypeEnum.CONNECT);
  });

  it('returns PLATFORM when metadata declares the Platform product', () => {
    expect(resolveOrganizationProductType({ productType: 'platform' })).toBe(OrganizationProductTypeEnum.PLATFORM);
  });

  it('defaults to PLATFORM for empty or missing metadata', () => {
    expect(resolveOrganizationProductType()).toBe(OrganizationProductTypeEnum.PLATFORM);
    expect(resolveOrganizationProductType(null)).toBe(OrganizationProductTypeEnum.PLATFORM);
    expect(resolveOrganizationProductType({})).toBe(OrganizationProductTypeEnum.PLATFORM);
  });

  it('defaults to PLATFORM for unknown or non-string values so we never trust bad data as Connect', () => {
    expect(resolveOrganizationProductType({ productType: 'unknown' })).toBe(OrganizationProductTypeEnum.PLATFORM);
    expect(resolveOrganizationProductType({ productType: null } as { productType: null })).toBe(
      OrganizationProductTypeEnum.PLATFORM
    );
  });
});

describe('tryReadOrganizationProductType', () => {
  it('returns undefined when metadata is missing or unrecognized', () => {
    expect(tryReadOrganizationProductType()).toBeUndefined();
    expect(tryReadOrganizationProductType({})).toBeUndefined();
    expect(tryReadOrganizationProductType({ productType: 'unknown' })).toBeUndefined();
  });

  it('returns explicit product values without applying a default', () => {
    expect(tryReadOrganizationProductType({ productType: 'connect' })).toBe(OrganizationProductTypeEnum.CONNECT);
    expect(tryReadOrganizationProductType({ productType: 'platform' })).toBe(OrganizationProductTypeEnum.PLATFORM);
  });
});
