import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface ExtractedSchemas {
  controlSchema?: Record<string, unknown>;
}

export async function extractStepSchemas(filePath: string): Promise<ExtractedSchemas> {
  let tmpFile: string | undefined;

  try {
    const result = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      write: false,
      jsx: 'automatic',
      jsxImportSource: 'react',
      loader: {
        '.ts': 'tsx',
        '.tsx': 'tsx',
        '.js': 'jsx',
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
  } catch {
    return {};
  } finally {
    if (tmpFile) {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}

function toJsonSchema(schema: unknown): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;

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

function isZodSchema(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_def' in value &&
    typeof (value as Record<string, unknown>)['_def'] === 'object'
  );
}
