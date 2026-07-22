export type WebhookSchemaSource = {
  name: string;
  payloadSchema?: string;
};

export type WebhookSchemaConflict = {
  source: string;
  type: string;
};

export type WebhookFieldSchema = {
  type?: string;
  description?: string;
  enum?: readonly string[];
  maxLength?: number;
  items?: WebhookFieldSchema;
  properties?: Record<string, WebhookFieldSchema>;
  sources: string[];
  conflicts?: WebhookSchemaConflict[];
};

export type MergedWebhookPayloadSchema = {
  properties: Record<string, WebhookFieldSchema>;
  ignoredSources: string[];
};

type WebhookIntegrationLike = {
  active: boolean;
  deleted: boolean;
  providerId: string;
  name: string;
  configurations?: unknown;
};

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

export function getActiveWebhookSchemaSources(integrations: WebhookIntegrationLike[]): WebhookSchemaSource[] {
  return integrations
    .filter((integration) => integration.active && !integration.deleted && integration.providerId === 'tool-webhook')
    .map((integration) => {
      const payloadSchema =
        isRecord(integration.configurations) && typeof integration.configurations.payloadSchema === 'string'
          ? integration.configurations.payloadSchema
          : undefined;

      return { name: integration.name, payloadSchema };
    });
}

function toFieldSchema(schema: JsonSchema, source: string): WebhookFieldSchema {
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
  const sources = [...new Set([...existing.sources, ...incoming.sources])];
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

  return { ...existing, sources };
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
  const ignoredSources: string[] = [];

  for (const source of sources) {
    const schema = parseRootSchema(source.payloadSchema);
    if (!schema || !isRecord(schema.properties)) {
      ignoredSources.push(source.name);
      continue;
    }

    for (const [key, value] of Object.entries(schema.properties)) {
      if (!isRecord(value)) {
        continue;
      }

      const field = toFieldSchema(value, source.name);
      properties[key] = properties[key] ? mergeFieldSchema(properties[key], field) : field;
    }
  }

  return { properties, ignoredSources };
}
