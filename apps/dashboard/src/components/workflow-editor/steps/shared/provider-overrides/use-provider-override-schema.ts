import { getProviderOverrideConfig, SLACK_OVERRIDE_SCHEMA_SUBPATH } from '@novu/shared';
import { useEffect, useState } from 'react';
import { getEagerRootSchema, getKeysOnlyRootSchema, type OverrideFieldSchema } from './override-field-schema';

export type OverrideSchemaState = {
  rootSchema: OverrideFieldSchema | undefined;
  isLoading: boolean;
  hasFailed: boolean;
};

const loadedSubpathSchemas = new Map<string, OverrideFieldSchema>();

/**
 * Slack's generated schema is a few hundred kilobytes and deliberately unreachable from the
 * `@novu/shared` barrel, so it is pulled in as its own chunk the first time its tab is opened.
 */
async function loadSubpathSchema(subpath: string): Promise<OverrideFieldSchema> {
  if (subpath !== SLACK_OVERRIDE_SCHEMA_SUBPATH) {
    throw new Error(`No lazily loaded override schema is registered for "${subpath}"`);
  }

  const { slackOverrideJsonSchema } = await import('@novu/shared/provider-overrides/slack');

  return slackOverrideJsonSchema as OverrideFieldSchema;
}

/**
 * Resolves the JSON schema backing a provider's override editor. Providers with an eager schema
 * resolve synchronously; providers behind a package subpath fall back to their top-level key
 * inventory while the chunk is in flight and keep it if the load fails. Escape-hatch providers
 * resolve to `undefined`, which suppresses autocomplete and the supported-fields popover.
 */
export function useProviderOverrideSchema(providerId: string): OverrideSchemaState {
  const config = getProviderOverrideConfig(providerId);
  const subpath = config?.schemaSubpath;
  const [loadedSchema, setLoadedSchema] = useState<OverrideFieldSchema | undefined>(() =>
    subpath ? loadedSubpathSchemas.get(subpath) : undefined
  );
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (!subpath || loadedSubpathSchemas.has(subpath)) {
      return;
    }

    let isActive = true;
    setHasFailed(false);

    loadSubpathSchema(subpath)
      .then((schema) => {
        loadedSubpathSchemas.set(subpath, schema);

        if (isActive) {
          setLoadedSchema(schema);
        }
      })
      .catch(() => {
        if (isActive) {
          setHasFailed(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [subpath]);

  if (config?.schema) {
    return { rootSchema: getEagerRootSchema(providerId), isLoading: false, hasFailed: false };
  }

  if (!subpath) {
    return { rootSchema: undefined, isLoading: false, hasFailed: false };
  }

  const cachedSchema = loadedSchema ?? loadedSubpathSchemas.get(subpath);
  if (cachedSchema) {
    return { rootSchema: cachedSchema, isLoading: false, hasFailed: false };
  }

  return { rootSchema: getKeysOnlyRootSchema(providerId), isLoading: !hasFailed, hasFailed };
}
