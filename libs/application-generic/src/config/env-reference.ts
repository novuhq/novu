import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { EnvBootRule, EnvSchema, EnvService, EnvVarDefinition } from './env';
import { envSchema } from './env.schema';
import { ENV_CONDITIONS, envFormatOf, expandEnvBootRule } from './env-validation';

/** Workspace packages whose reads the reference lists, when the app depends on them. */
const SCANNED_PACKAGES = new Set(['@novu/application-generic', '@novu/dal', '@novu/framework', '@novu/shared']);
const ENTERPRISE_PREFIX = '@novu/ee-';
const PACKAGE_ROOTS = ['libs', 'packages', 'enterprise/packages'];
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'build', 'e2e', '__tests__', 'tests', 'test']);
const SKIPPED_FILES = /\.(spec|test|e2e|e2e-ee)\.[cm]?[jt]sx?$|\.d\.ts$|test-helpers\.ts$/;
const SOURCE_FILES = /\.[cm]?[jt]sx?$/;
/** The files that declare variables. Their keys and descriptions are not reads. */
const DECLARATION_FILES = /config[\\/]env(\.schema)?\.ts$/;
const READ_PATTERNS = [
  /process\.env\.([A-Za-z_]\w*)/g,
  /process\.env\[\s*['"`]([A-Za-z_]\w*)['"`]\s*\]/g,
  /\benv\.([A-Za-z_]\w*)/g,
  // A quoted upper-case name: lookups by a computed name, such as the SQS queue URL per topic.
  /['"]([A-Z][A-Z0-9]*_[A-Z0-9_]+)['"]/g,
];
const DESTRUCTURED = /\{([^{}]*)\}\s*=\s*process\.env\b/g;
/** Block and line comments, so names they mention don't count as reads. `://` in URLs is not a comment. */
const COMMENTS = /\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm;

interface EnvReaderSource {
  /** The app's service name, or a package name such as '@novu/dal'. */
  label: string;
  dir: string;
  enterprise: boolean;
}

export interface EnvReferenceOptions {
  repoRoot: string;
  service: EnvService;
  appSchema: EnvSchema;
}

export interface EnvReferenceResult {
  /** `apps/<service>/ENVIRONMENT.md`. */
  file: string;
  markdown: string;
  /** Whether the file on disk matches `markdown`, after writing it when `update` is set. */
  upToDate: boolean;
  /** `readBy` entries that name a workspace package which no longer reads the variable. */
  problems: string[];
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
      walk(full, files);
    } else if (entry.isFile() && SOURCE_FILES.test(entry.name) && !SKIPPED_FILES.test(entry.name)) {
      files.push(full);
    }
  }

  return files;
}

/** Every name the source tree reads, in any of the forms our code and our dependencies use. */
function namesReadIn(dir: string): Set<string> {
  const names = new Set<string>();

  for (const file of walk(dir)) {
    if (DECLARATION_FILES.test(file)) {
      continue;
    }

    const text = readFileSync(file, 'utf8').replace(COMMENTS, '$1');

    for (const pattern of READ_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        names.add(match[1]);
      }
    }

    for (const match of text.matchAll(DESTRUCTURED)) {
      for (const part of match[1].split(',')) {
        names.add(part.split(/[:=]/)[0].trim());
      }
    }
  }

  return names;
}

function readPackageJson(dir: string): {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
} {
  return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
}

/** The app's source plus the scanned workspace packages it depends on. */
function readerSources(repoRoot: string, service: EnvService): EnvReaderSource[] {
  const appDir = path.join(repoRoot, 'apps', service);
  const { dependencies = {}, optionalDependencies = {} } = readPackageJson(appDir);
  const dependencyNames = new Set([...Object.keys(dependencies), ...Object.keys(optionalDependencies)]);
  const sources: EnvReaderSource[] = [{ label: service, dir: path.join(appDir, 'src'), enterprise: false }];

  for (const root of PACKAGE_ROOTS) {
    for (const entry of readdirSync(path.join(repoRoot, root), { withFileTypes: true })) {
      const dir = path.join(repoRoot, root, entry.name);
      const name = existsSync(path.join(dir, 'package.json')) ? readPackageJson(dir).name : undefined;
      const enterprise = Boolean(name?.startsWith(ENTERPRISE_PREFIX));

      if (name && dependencyNames.has(name) && (enterprise || SCANNED_PACKAGES.has(name))) {
        sources.push({ label: name, dir: path.join(dir, 'src'), enterprise });
      }
    }
  }

  return sources.sort((a, b) => (a.label < b.label ? -1 : 1));
}

const ROW = /^\| `([^`]+)` \|.*\| ([^|]*) \|$/;

/** Enterprise readers listed in a previously generated reference, for packages whose source is missing. */
function previousEnterpriseReaders(markdown: string): Map<string, string[]> {
  const readers = new Map<string, string[]>();

  for (const line of markdown.split('\n')) {
    const row = line.match(ROW);
    const labels = row?.[2].match(/`@novu\/ee-[^`]+`/g);

    if (row && labels) {
      readers.set(
        row[1],
        labels.map((label) => label.slice(1, -1))
      );
    }
  }

  return readers;
}

/**
 * Which sources read each declared variable. An enterprise package checked out without its source
 * (no `.source` submodule) keeps the readers the committed reference lists for it.
 */
function findReaders(sources: EnvReaderSource[], schema: EnvSchema, previous: string): Map<string, Set<string>> {
  const readers = new Map(Object.keys(schema).map((name) => [name, new Set<string>()]));
  const carriedOver = previousEnterpriseReaders(previous);

  for (const source of sources) {
    if (existsSync(source.dir)) {
      for (const name of namesReadIn(source.dir)) {
        readers.get(name)?.add(source.label);
      }
    } else if (source.enterprise) {
      for (const [name, labels] of carriedOver) {
        if (labels.includes(source.label)) {
          readers.get(name)?.add(source.label);
        }
      }
    }
  }

  return readers;
}

function staleReadBy(schema: EnvSchema, sources: EnvReaderSource[], readers: Map<string, Set<string>>): string[] {
  const scanned = new Set(sources.filter((source) => existsSync(source.dir)).map((source) => source.label));
  const problems: string[] = [];

  for (const [name, definition] of Object.entries(schema)) {
    for (const reader of definition.readBy ?? []) {
      if (scanned.has(reader) && !readers.get(name)?.has(reader)) {
        problems.push(`${name}: readBy lists ${reader}, which no longer reads it.`);
      }
    }
  }

  return problems;
}

/** Text that stays inside one Markdown table cell: escaped backslashes and pipes, on one line. */
function cell(text: string): string {
  return text.replace(/[\\|]/g, '\\$&').replace(/\s*\n\s*/g, ' ');
}

const FORMAT_LABELS = {
  boolean: 'boolean',
  json: 'JSON',
  number: 'number',
  port: 'port',
  string: 'string',
  'tls-flag': 'TLS flag',
  url: 'URL',
};

function describeFormat(definition: EnvVarDefinition): string {
  const format = FORMAT_LABELS[envFormatOf(definition)];

  return definition.choices ? `${format}: ${definition.choices.join(', ')}` : format;
}

function describeDefault(definition: EnvVarDefinition): string {
  if (definition.deprecated) {
    return '';
  }

  if (definition.default !== undefined) {
    return `\`${definition.default}\``;
  }

  return definition.type === 'boolean' ? '`false`' : '';
}

function describeBoot(rule: EnvBootRule | undefined): string {
  if (!rule) {
    return '';
  }

  const { required, when, choices, length } = expandEnvBootRule(rule);
  const parts = [];

  if (typeof required === 'string') {
    parts.push(`required when ${ENV_CONDITIONS[required].description}, otherwise checked`);
  } else {
    parts.push(required ? 'required' : 'checked');
  }

  if (length !== undefined) {
    parts.push(`exactly ${length} characters`);
  }

  if (choices) {
    parts.push(`one of ${choices.join(', ')}`);
  }

  const check = parts.join(', ');

  return when ? `when ${ENV_CONDITIONS[when].description}: ${check}` : check;
}

function describeDefinition(definition: EnvVarDefinition): string {
  return definition.deprecated
    ? `**Deprecated:** ${definition.deprecated} ${definition.description}`
    : definition.description;
}

function renderReference(
  service: EnvService,
  schema: EnvSchema,
  appKeys: Set<string>,
  readers: Map<string, Set<string>>
): string {
  const rows = Object.keys(schema)
    .sort()
    .map((name) => {
      const definition = schema[name];
      const declaredIn = appKeys.has(name) ? service : 'shared';
      const readBy = [
        ...[...(readers.get(name) ?? [])].map((label) => `\`${label}\``),
        ...(definition.readBy ?? []).filter((reader) => !reader.startsWith('@novu/')),
      ];

      return `| \`${name}\` | ${cell(describeDefinition(definition))} | ${describeFormat(definition)} | ${describeDefault(definition)} | ${cell(describeBoot(definition.boot?.[service]))} | ${declaredIn} | ${readBy.join(', ')} |`;
    });

  return [
    `<!-- Generated by apps/${service}/src/config/env.spec.ts from the env schemas. Do not edit by hand. -->`,
    '',
    `# \`${service}\` environment variables`,
    '',
    `Every variable \`${service}\` uses, declared in \`libs/application-generic/src/config/env.schema.ts\` (shared) and \`apps/${service}/src/config/env.ts\`.`,
    '',
    `- **Boot**: what \`validateEnv\` checks when \`${service}\` starts. A required variable must be set; a checked one must match its format when set. Variables with no rule are not checked.`,
    `- **Read by**: the code that reads the variable, found by scanning \`${service}\` and the workspace packages it depends on, plus the SDKs listed in \`readBy\`.`,
    '- Feature flags (`FeatureFlagsKeysEnum` in `@novu/shared`) and other families read by a computed name are described in the schema headers instead.',
    '',
    `To regenerate after changing a schema or a read, run the spec with \`UPDATE_ENV_REFERENCE=true\`. Without \`.source\` checked out, enterprise readers are kept as listed.`,
    '',
    '| Variable | Description | Format | Default | Boot | Declared in | Read by |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

/**
 * Builds `apps/<service>/ENVIRONMENT.md` from the shared and app schemas plus the code that reads each
 * variable, and checks every `readBy` workspace package still reads its variable. With `update`, writes
 * the file when it changed.
 */
export function syncEnvReference(options: EnvReferenceOptions & { update?: boolean }): EnvReferenceResult {
  const { repoRoot, service, appSchema } = options;
  const file = path.join(repoRoot, 'apps', service, 'ENVIRONMENT.md');
  const previous = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const schema: EnvSchema = { ...envSchema, ...appSchema };
  const sources = readerSources(repoRoot, service);
  const readers = findReaders(sources, schema, previous);
  const markdown = renderReference(service, schema, new Set(Object.keys(appSchema)), readers);

  if (options.update && markdown !== previous) {
    writeFileSync(file, markdown);
  }

  return {
    file,
    markdown,
    upToDate: Boolean(options.update) || markdown === previous,
    problems: staleReadBy(schema, sources, readers),
  };
}
