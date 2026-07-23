export type WebhookSchemaSourceRef = {
  name: string;
  identifier: string;
};

export type WebhookSchemaSource = WebhookSchemaSourceRef & {
  payloadSchema?: string;
};

export type WebhookSchemaConflict = {
  source: WebhookSchemaSourceRef;
  type: string;
};

export type WebhookFieldSchema = {
  type?: string;
  description?: string;
  enum?: readonly string[];
  maxLength?: number;
  items?: WebhookFieldSchema;
  properties?: Record<string, WebhookFieldSchema>;
  sources: WebhookSchemaSourceRef[];
  conflicts?: WebhookSchemaConflict[];
};

export type MergedWebhookPayloadSchema = {
  properties: Record<string, WebhookFieldSchema>;
  ignoredSources: WebhookSchemaSourceRef[];
};

type WebhookIntegrationLike = {
  active: boolean;
  deleted: boolean;
  providerId: string;
  name: string;
  identifier: string;
  configurations?: unknown;
};

/** UI label for a schema source: "<name> (id: <identifier>)". */
export function formatWebhookSchemaSourceLabel(source: WebhookSchemaSourceRef): string {
  return `${source.name} (id: ${source.identifier})`;
}

type JsonSchema = {
  type?: unknown;
  description?: unknown;
  enum?: unknown;
  maxLength?: unknown;
  items?: unknown;
  properties?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toSourceRef(source: WebhookSchemaSource): WebhookSchemaSourceRef {
  return { name: source.name, identifier: source.identifier };
}

function mergeSourceRefs(
  existing: WebhookSchemaSourceRef[],
  incoming: WebhookSchemaSourceRef[]
): WebhookSchemaSourceRef[] {
  const byIdentifier = new Map<string, WebhookSchemaSourceRef>();

  for (const source of [...existing, ...incoming]) {
    byIdentifier.set(source.identifier, source);
  }

  return [...byIdentifier.values()];
}

export function getActiveWebhookSchemaSources(integrations: WebhookIntegrationLike[]): WebhookSchemaSource[] {
  return integrations
    .filter((integration) => integration.active && !integration.deleted && integration.providerId === 'tool-webhook')
    .map((integration) => {
      const payloadSchema =
        isRecord(integration.configurations) && typeof integration.configurations.payloadSchema === 'string'
          ? integration.configurations.payloadSchema
          : undefined;

      return { name: integration.name, identifier: integration.identifier, payloadSchema };
    });
}

function toFieldSchema(schema: JsonSchema, source: WebhookSchemaSourceRef): WebhookFieldSchema {
  const field: WebhookFieldSchema = {
    sources: [source],
  };

  if (typeof schema.type === 'string') {
    field.type = schema.type;
  }

  if (typeof schema.description === 'string') {
    field.description = schema.description;
  }

  if (Array.isArray(schema.enum) && schema.enum.every((value) => typeof value === 'string')) {
    field.enum = schema.enum;
  }

  if (typeof schema.maxLength === 'number') {
    field.maxLength = schema.maxLength;
  }

  if (isRecord(schema.items)) {
    field.items = toFieldSchema(schema.items, source);
  }

  if (isRecord(schema.properties)) {
    field.properties = Object.fromEntries(
      Object.entries(schema.properties)
        .filter((entry): entry is [string, JsonSchema] => isRecord(entry[1]))
        .map(([key, value]) => [key, toFieldSchema(value, source)])
    );
  }

  return field;
}

function mergeFieldSchema(existing: WebhookFieldSchema, incoming: WebhookFieldSchema): WebhookFieldSchema {
  const sources = mergeSourceRefs(existing.sources, incoming.sources);
  const typesConflict = existing.type !== undefined && incoming.type !== undefined && existing.type !== incoming.type;

  if (typesConflict || existing.conflicts) {
    const conflicts = [
      ...(existing.conflicts ?? existing.sources.map((source) => ({ source, type: existing.type ?? 'any' }))),
      ...(incoming.conflicts ?? incoming.sources.map((source) => ({ source, type: incoming.type ?? 'any' }))),
    ];

    return { ...existing, sources, conflicts };
  }

  if (existing.type === 'object' && incoming.type === 'object') {
    const properties = { ...existing.properties };
    for (const [key, field] of Object.entries(incoming.properties ?? {})) {
      properties[key] = properties[key] ? mergeFieldSchema(properties[key], field) : field;
    }

    return { ...existing, sources, properties };
  }

  const enumValues =
    existing.enum && incoming.enum ? existing.enum.filter((value) => incoming.enum?.includes(value)) : existing.enum;
  const maxLength =
    existing.maxLength !== undefined && incoming.maxLength !== undefined
      ? Math.min(existing.maxLength, incoming.maxLength)
      : (existing.maxLength ?? incoming.maxLength);
  const items =
    existing.items && incoming.items
      ? mergeFieldSchema(existing.items, incoming.items)
      : (existing.items ?? incoming.items);

  return { ...existing, sources, enum: enumValues ?? incoming.enum, maxLength, items };
}

function parseRootSchema(payloadSchema: string | undefined): JsonSchema | undefined {
  if (!payloadSchema) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(payloadSchema);
    if (!isRecord(parsed) || parsed.type !== 'object' || !isRecord(parsed.properties)) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export function mergeWebhookPayloadSchemas(sources: WebhookSchemaSource[]): MergedWebhookPayloadSchema {
  const properties: Record<string, WebhookFieldSchema> = {};
  const ignoredSources: WebhookSchemaSourceRef[] = [];

  for (const source of sources) {
    const sourceRef = toSourceRef(source);
    const schema = parseRootSchema(source.payloadSchema);
    if (!schema || !isRecord(schema.properties)) {
      ignoredSources.push(sourceRef);
      continue;
    }

    for (const [key, value] of Object.entries(schema.properties)) {
      if (!isRecord(value)) {
        continue;
      }

      const field = toFieldSchema(value, sourceRef);
      properties[key] = properties[key] ? mergeFieldSchema(properties[key], field) : field;
    }
  }

  return { properties, ignoredSources };
}
