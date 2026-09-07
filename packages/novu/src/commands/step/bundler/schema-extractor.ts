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
