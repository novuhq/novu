import { CONTENT_OVERRIDE_PROVIDER_IDS } from '@novu/shared';
import { getMetadataStorage } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ProviderOverridesDto } from './provider-overrides.dto';

describe('ProviderOverridesDto', () => {
  it('declares a property for every provider that supports content overrides', () => {
    const declared = new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(ProviderOverridesDto, '', false, false)
        .map((metadata) => metadata.propertyName)
    );

    expect([...CONTENT_OVERRIDE_PROVIDER_IDS].sort()).toEqual([...declared].sort());
  });
});
