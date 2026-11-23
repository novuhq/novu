import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getCliNodeModulesPaths } from './node-paths';

export interface ExtractedSchemas {
  controlSchema?: Record<string, unknown>;
}

export async function extractStepSchemas(filePath: string): Promise<ExtractedSchemas> {
  let tmpFile: string | undefined;
  let moduleKey: string | undefined;

  try {
    const result = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node22',
      write: false,
      jsx: 'automatic',
      jsxImportSource: 'react',
      nodePaths: getCliNodeModulesPaths(),
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.js': 'js',
        '.jsx': 'jsx',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      logLevel: 'silent',
    });

    const code = result.outputFiles?.[0]?.text;

    if (!code) {
      return {};
    }

    tmpFile = path.join(os.tmpdir(), `novu-schema-extract-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`);
    await fs.writeFile(tmpFile, code, 'utf8');

    // ts-node runs in CJS mode where dynamic import() is transpiled to require(),
    // which doesn't accept file:// URLs — use require() directly instead.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduleKey = require.resolve(tmpFile);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(tmpFile);
    const stepResolver = mod?.default ?? mod;

    if (!stepResolver || typeof stepResolver !== 'object') {
      return {};
    }

    const schemas: ExtractedSchemas = {};

    if ((stepResolver as Record<string, unknown>).controlSchema) {
      schemas.controlSchema = toJsonSchema((stepResolver as Record<string, unknown>).controlSchema);
    }

    return schemas;
  } catch (error) {
    console.error('[schema-extractor] Failed to extract schemas from', filePath, error);
    return {};
  } finally {
    if (moduleKey) {
      delete require.cache[moduleKey];
    }
    if (tmpFile) {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}

function toJsonSchema(schema: unknown): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;

  if (isZodV4Schema(schema)) {
    try {
      return zodV4ToJsonSchema(schema);
    } catch {
      return undefined;
    }
  }

  if (isZodSchema(schema)) {
    try {
      return zodToJsonSchema(schema as Parameters<typeof zodToJsonSchema>[0], {
        target: 'jsonSchema7',
      }) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  if ('type' in schema || 'properties' in schema || '$schema' in schema) {
    return schema as Record<string, unknown>;
  }

  return undefined;
}

// Checking internal Zod internals (_def) is fragile; we supplement with public
// method checks (parse/safeParse) as fallbacks for increased confidence.
function isZodSchema(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;

  return (
    (typeof v['_def'] === 'object' && v['_def'] !== null) ||
    typeof v['parse'] === 'function' ||
    typeof v['safeParse'] === 'function'
  );
}

type ZodV4Schema = {
  _zod: unknown;
  toJSONSchema: (params: Record<string, unknown>) => Record<string, unknown>;
};

// `zod-to-json-schema` only understands Zod v3 schemas and returns an empty schema for Zod v4 ones
// (`zod@4`, or the `zod/v4` subpath of `zod@3.25`), so those use Zod's own converter.
function isZodV4Schema(value: unknown): value is ZodV4Schema {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_zod' in value &&
    typeof (value as { toJSONSchema?: unknown }).toJSONSchema === 'function'
  );
}

// Keeps the output aligned with `zod-to-json-schema` for v3 schemas: draft-07, `.default()` fields
// optional, and `additionalProperties: false` on objects that strip unknown keys.
function zodV4ToJsonSchema(schema: ZodV4Schema): Record<string, unknown> {
  return schema.toJSONSchema({
    target: 'draft-7',
    io: 'input',
    unrepresentable: 'any',
    override: ({
      zodSchema,
      jsonSchema,
    }: {
      zodSchema: { _zod: { def: { type: string; catchall?: unknown } } };
      jsonSchema: Record<string, unknown>;
    }) => {
      const { def } = zodSchema._zod;
      if (def.type === 'object' && def.catchall === undefined && jsonSchema.additionalProperties === undefined) {
        jsonSchema.additionalProperties = false;
      }
      // Zod v4 bounds `.int()` to the safe-integer range, which `zod-to-json-schema` left implicit.
      if (jsonSchema.type === 'integer') {
        if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum;
        if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum;
      }
      // Zod v4 emits `oneOf` for discriminated unions where `zod-to-json-schema` emitted `anyOf`.
      if (def.type === 'union' && jsonSchema.oneOf !== undefined && jsonSchema.anyOf === undefined) {
        jsonSchema.anyOf = jsonSchema.oneOf;
        delete jsonSchema.oneOf;
      }
    },
  });
}
