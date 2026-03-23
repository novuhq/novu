import * as esbuild from 'esbuild';
import * as path from 'path';
import { generateWorkerWrapper } from '../templates/worker-wrapper';
import type { DiscoveredStep, StepResolverReleaseBundle } from '../types';
import { getBundlerConfig } from './config';
import { getCliNodeModulesPaths } from './node-paths';

const MAX_BUNDLE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const BUNDLE_LABEL = 'step-resolver-release';

interface BundleBuildOptions {
  minify?: boolean;
  aliases?: Record<string, string>;
}

export async function bundleRelease(
  steps: DiscoveredStep[],
  rootDir: string,
  options: BundleBuildOptions = {}
): Promise<StepResolverReleaseBundle> {
  return bundleSteps(BUNDLE_LABEL, steps, rootDir, options);
}

export function formatBundleSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }
}

function formatBundlingError(bundleLabel: string, error: unknown): Error {
  if (isBuildFailure(error)) {
    const unresolvedImports = error.errors.filter((entry) => entry.text.includes('Could not resolve'));
    if (unresolvedImports.length > 0) {
      const details = unresolvedImports
        .map((entry) => {
          if (!entry.location) {
            return entry.text;
          }

          return `${entry.text} (${entry.location.file}:${entry.location.line}:${entry.location.column})`;
        })
        .join('\n  • ');

      return new Error(
        `Failed to bundle release: ${bundleLabel}\n\n` +
          `Unresolved imports:\n` +
          `  • ${details}\n\n` +
          `Hints:\n` +
          `  • Add custom path aliases in novu.config.ts under the aliases field\n` +
          `  • Or define aliases in tsconfig/jsconfig paths and run publish from the matching project root`
      );
    }

    return new Error(`Failed to bundle release: ${bundleLabel}\n${error.message}`);
  }

  if (error instanceof Error) {
    return new Error(`Failed to bundle release: ${bundleLabel}\n${error.message}`);
  }

  return new Error(`Failed to bundle release: ${bundleLabel}`);
}

function isBuildFailure(error: unknown): error is esbuild.BuildFailure {
  return typeof error === 'object' && error !== null && 'errors' in error && Array.isArray(error.errors);
}

async function bundleSteps(
  bundleId: string,
  steps: DiscoveredStep[],
  rootDir: string,
  options: BundleBuildOptions
): Promise<{ code: string; size: number }> {
  const wrapperCode = generateWorkerWrapper(steps, rootDir);
  const baseConfig = getBundlerConfig({
    rootDir,
    minify: options.minify,
    aliases: options.aliases,
    nodePaths: getCliNodeModulesPaths(),
  });

  let result: esbuild.BuildResult;

  try {
    result = await esbuild.build({
      ...baseConfig,
      stdin: {
        contents: wrapperCode,
        loader: 'tsx',
        resolveDir: rootDir,
        sourcefile: `${bundleId}-worker.tsx`,
      },
      write: false,
      metafile: true,
    });
  } catch (error) {
    throw formatBundlingError(bundleId, error);
  }

  const outputFile = result.outputFiles?.[0];
  if (!outputFile) {
    throw new Error(`No output from esbuild for bundle: ${bundleId}`);
  }

  const code = outputFile.text;
  const size = Buffer.byteLength(code, 'utf8');

  if (size > MAX_BUNDLE_SIZE) {
    throw new Error(
      `Bundle too large: ${bundleId}\n\n` +
        `   Bundle size: ${(size / 1024 / 1024).toFixed(1)} MB\n` +
        `   Maximum: ${MAX_BUNDLE_SIZE / 1024 / 1024} MB (Cloudflare limit)\n\n` +
        `Suggestions:\n` +
        `  • Reduce template complexity\n` +
        `  • Remove unused dependencies\n` +
        `  • Publish specific workflows with --workflow for targeted updates`
    );
  }

  return { code, size };
}
