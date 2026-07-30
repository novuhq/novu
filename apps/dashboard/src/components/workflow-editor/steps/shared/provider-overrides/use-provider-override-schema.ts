import {
  getProviderOverrideConfig,
  SLACK_OVERRIDE_SCHEMA_SUBPATH,
  TELEGRAM_OVERRIDE_SCHEMA_SUBPATH,
  WHATSAPP_OVERRIDE_SCHEMA_SUBPATH,
} from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { getEagerRootSchema, getKeysOnlyRootSchema, type OverrideFieldSchema } from './override-field-schema';

export type OverrideSchemaState = {
  rootSchema: OverrideFieldSchema | undefined;
  /** True while a lazily loaded schema is in flight or after it failed: only top-level keys are known. */
  isTopLevelKeysOnly: boolean;
  isLoading: boolean;
};

/**
 * Generated schemas (Slack Block Kit, Telegram reply_markup / MessageEntity, …) are deliberately
 * unreachable from the `@novu/shared` barrel, so each is pulled in as its own chunk the first time
 * its tab is opened. Keyed by the `schemaSubpath` the provider registry records: a provider that
 * gains a lazy schema without an entry here degrades to its top-level key list.
 */
const SUBPATH_SCHEMA_LOADERS: Record<string, () => Promise<OverrideFieldSchema>> = {
  [SLACK_OVERRIDE_SCHEMA_SUBPATH]: async () => {
    const { slackOverrideJsonSchema } = await import('@novu/shared/provider-overrides/slack');

    return slackOverrideJsonSchema as OverrideFieldSchema;
  },
  [TELEGRAM_OVERRIDE_SCHEMA_SUBPATH]: async () => {
    const { telegramOverrideJsonSchema } = await import('@novu/shared/provider-overrides/telegram');

    return telegramOverrideJsonSchema as OverrideFieldSchema;
  },
  [WHATSAPP_OVERRIDE_SCHEMA_SUBPATH]: async () => {
    const { whatsappOverrideJsonSchema } = await import('@novu/shared/provider-overrides/whatsapp');

    return whatsappOverrideJsonSchema as OverrideFieldSchema;
  },
};

const loadedSubpathSchemas = new Map<string, OverrideFieldSchema>();

type LoadOutcome = { subpath: string; schema?: OverrideFieldSchema };

/**
 * Resolves the JSON schema backing a provider's override editor. Providers with an eager schema
 * resolve synchronously; providers behind a package subpath fall back to their top-level key
 * inventory while the chunk is in flight and keep it if the load fails. Escape-hatch providers
 * resolve to `undefined`, which suppresses autocomplete and the supported-fields popover.
 */
export function useProviderOverrideSchema(providerId: string): OverrideSchemaState {
  const config = getProviderOverrideConfig(providerId);
  const subpath = config?.schemaSubpath;
  // Keyed by subpath so a provider switch cannot serve the previously loaded provider's schema.
  const [outcome, setOutcome] = useState<LoadOutcome | undefined>();
  const keysOnlySchema = useMemo(() => getKeysOnlyRootSchema(providerId), [providerId]);

  useEffect(() => {
    if (!subpath || loadedSubpathSchemas.has(subpath)) {
      return;
    }

    let isActive = true;

    const load = SUBPATH_SCHEMA_LOADERS[subpath];
    if (!load) {
      setOutcome({ subpath });

      return;
    }

    load()
      .then((schema) => {
        loadedSubpathSchemas.set(subpath, schema);

        if (isActive) {
          setOutcome({ subpath, schema });
        }
      })
      .catch(() => {
        if (isActive) {
          setOutcome({ subpath });
        }
      });

    return () => {
      isActive = false;
    };
  }, [subpath]);

  if (config?.schema) {
    return { rootSchema: getEagerRootSchema(providerId), isTopLevelKeysOnly: false, isLoading: false };
  }

  if (!subpath) {
    return { rootSchema: undefined, isTopLevelKeysOnly: false, isLoading: false };
  }

  const cachedSchema = loadedSubpathSchemas.get(subpath);
  if (cachedSchema) {
    return { rootSchema: cachedSchema, isTopLevelKeysOnly: false, isLoading: false };
  }

  const hasFailed = outcome?.subpath === subpath && !outcome.schema;

  return { rootSchema: keysOnlySchema, isTopLevelKeysOnly: true, isLoading: !hasFailed };
}
