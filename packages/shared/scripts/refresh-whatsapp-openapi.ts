/**
 * Fetches Meta's business-messaging OpenAPI YAML at a pinned commit and writes the pruned
 * Message-schema transitive closure to `scripts/vendor/whatsapp-messages.openapi.json`.
 *
 * Network-bound and manual — the generator and drift spec read only the vendored JSON.
 *
 *   pnpm --filter @novu/shared refresh:whatsapp-openapi
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const vendorPath = join(scriptDir, 'vendor/whatsapp-messages.openapi.json');

/** Pinned facebook/openapi commit that ships `business-messaging-api_v23.0.yaml`. */
export const WHATSAPP_OPENAPI_UPSTREAM_COMMIT = '5f30dc1c6b482e67149ae6de0b27f19285d12839';
export const WHATSAPP_OPENAPI_UPSTREAM_FILE = 'business-messaging-api_v23.0.yaml';
export const WHATSAPP_OPENAPI_API_VERSION = 'v23.0';

const ROOT_SCHEMA = 'Message';

type SchemaMap = Record<string, unknown>;

function refName(ref: string): string {
  const name = ref.split('/').pop();
  if (!name) {
    throw new Error(`Could not parse schema name from ref ${ref}`);
  }

  return name;
}

/** Collect every schema reachable from `Message`, including discriminator.mapping targets. */
export function collectMessageClosure(schemas: SchemaMap): SchemaMap {
  const root = schemas[ROOT_SCHEMA];
  if (root === undefined) {
    throw new Error(`Upstream OpenAPI is missing components.schemas.${ROOT_SCHEMA}.`);
  }

  const seen = new Set<string>();

  function visit(node: unknown): void {
    if (node === null || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      for (const entry of node) {
        visit(entry);
      }

      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.$ref === 'string' && record.$ref.includes('/schemas/')) {
      enqueue(refName(record.$ref));
    }

    const discriminator = record.discriminator;
    if (discriminator !== null && typeof discriminator === 'object') {
      const mapping = (discriminator as { mapping?: Record<string, string> }).mapping;
      if (mapping) {
        for (const mappedRef of Object.values(mapping)) {
          enqueue(refName(mappedRef));
        }
      }
    }

    for (const value of Object.values(record)) {
      visit(value);
    }
  }

  function enqueue(name: string): void {
    if (seen.has(name)) {
      return;
    }

    const schema = schemas[name];
    if (schema === undefined) {
      throw new Error(`Message closure references missing schema \`${name}\`.`);
    }

    seen.add(name);
    visit(schema);
  }

  enqueue(ROOT_SCHEMA);

  const closure: SchemaMap = {};
  for (const name of [...seen].sort()) {
    closure[name] = schemas[name];
  }

  return closure;
}

export type WhatsappOpenApiVendorFile = {
  meta: {
    upstreamFile: string;
    upstreamCommit: string;
    apiVersion: string;
    generatedAt: string;
  };
  schemas: SchemaMap;
};

export async function refreshWhatsappOpenApi(fetchImpl: typeof fetch = fetch): Promise<WhatsappOpenApiVendorFile> {
  const url = `https://raw.githubusercontent.com/facebook/openapi/${WHATSAPP_OPENAPI_UPSTREAM_COMMIT}/${WHATSAPP_OPENAPI_UPSTREAM_FILE}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const document = loadYaml(await response.text()) as {
    components?: { schemas?: SchemaMap };
  };
  const schemas = document.components?.schemas;
  if (!schemas || typeof schemas !== 'object') {
    throw new Error('Upstream OpenAPI has no components.schemas.');
  }

  const vendor: WhatsappOpenApiVendorFile = {
    meta: {
      upstreamFile: WHATSAPP_OPENAPI_UPSTREAM_FILE,
      upstreamCommit: WHATSAPP_OPENAPI_UPSTREAM_COMMIT,
      apiVersion: WHATSAPP_OPENAPI_API_VERSION,
      generatedAt: new Date().toISOString(),
    },
    schemas: collectMessageClosure(schemas),
  };

  mkdirSync(dirname(vendorPath), { recursive: true });
  writeFileSync(vendorPath, `${JSON.stringify(vendor, null, 2)}\n`);

  return vendor;
}

async function main(): Promise<void> {
  const vendor = await refreshWhatsappOpenApi();
  process.stdout.write(
    `Wrote ${Object.keys(vendor.schemas).length} schemas to ${vendorPath} (commit ${vendor.meta.upstreamCommit})\n`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
