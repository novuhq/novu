/**
 * Audits DTO class properties for consistency between TypeScript optionality (`?`)
 * and @nestjs/swagger decorators (@ApiProperty vs @ApiPropertyOptional), including
 * explicit `required: true | false` in decorator options.
 *
 * Run: pnpm check:api-property-optionality (from repo root) or pnpm run check:api-property-optionality in apps/api
 * Run: pnpm  pnpm --filter @novu/api-service run check:api-property-optionality --format json --write-report .cursor/api-property-optionality-report.json
 *
 * Options:
 *   --format text|json   Human text (default) or JSON on stdout for automation
 *   --write-report PATH  Write the same JSON report to PATH (repo-relative or absolute)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { type Decorator, Project, type SourceFile } from 'ts-morph';
import { SyntaxKind } from 'typescript';

const REPORT_VERSION = 1 as const;

type IssueKind = 'ts_optional_openapi_required' | 'ts_required_openapi_optional';

type Issue = {
  file: string;
  line: number;
  propertyName: string;
  kind: IssueKind;
  message: string;
};

type Report = {
  version: typeof REPORT_VERSION;
  issueCount: number;
  issues: Issue[];
};

const REPO_ROOT = path.resolve(__dirname, '../../..');

const DTO_GLOBS = ['apps/api/**/*.dto.ts', 'libs/application-generic/**/*.dto.ts'] as const;

const SWAGGER_DECORATORS = new Set(['ApiProperty', 'ApiPropertyOptional']);

function getRequiredFromDecoratorOptions(decorator: Decorator): boolean | undefined {
  const call = decorator.getCallExpression();

  if (!call) {
    return undefined;
  }

  const args = call.getArguments();

  if (args.length === 0) {
    return undefined;
  }

  const first = args[0];

  if (first.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return undefined;
  }

  const requiredProp = first.getProperty('required');

  if (!requiredProp || requiredProp.getKind() !== SyntaxKind.PropertyAssignment) {
    return undefined;
  }

  const init = requiredProp.getInitializer();

  if (!init) {
    return undefined;
  }

  const text = init.getText();

  if (text === 'true') {
    return true;
  }

  if (text === 'false') {
    return false;
  }

  return undefined;
}

function effectiveOpenApiRequired(decorator: Decorator): boolean {
  const name = decorator.getName();
  const explicit = getRequiredFromDecoratorOptions(decorator);

  if (explicit !== undefined) {
    return explicit;
  }

  if (name === 'ApiProperty') {
    return true;
  }

  if (name === 'ApiPropertyOptional') {
    return false;
  }

  return true;
}

function collectIssuesForFile(sourceFile: SourceFile): Issue[] {
  const issues: Issue[] = [];
  const file = path.relative(REPO_ROOT, sourceFile.getFilePath());

  for (const cls of sourceFile.getClasses()) {
    for (const prop of cls.getProperties()) {
      const swaggerDecorator = prop.getDecorators().find((d) => SWAGGER_DECORATORS.has(d.getName()));

      if (!swaggerDecorator) {
        continue;
      }

      const tsOptional = prop.hasQuestionToken();
      const openApiRequired = effectiveOpenApiRequired(swaggerDecorator);
      const openApiOptional = !openApiRequired;

      if (tsOptional === openApiOptional) {
        continue;
      }

      const line = prop.getStartLineNumber();
      const propName = prop.getName();
      const decoratorName = swaggerDecorator.getName();

      if (tsOptional && !openApiOptional) {
        issues.push({
          file,
          line,
          propertyName: propName,
          kind: 'ts_optional_openapi_required',
          message: `Property "${propName}" is optional in TypeScript but marked required in OpenAPI (${decoratorName}). Use @ApiPropertyOptional, or @ApiProperty({ required: false }).`,
        });
      } else if (!tsOptional && openApiOptional) {
        issues.push({
          file,
          line,
          propertyName: propName,
          kind: 'ts_required_openapi_optional',
          message: `Property "${propName}" is required in TypeScript but marked optional in OpenAPI (${decoratorName}). Use @ApiProperty, or @ApiPropertyOptional({ required: true }).`,
        });
      }
    }
  }

  return issues;
}

function buildReport(issues: Issue[]): Report {
  return {
    version: REPORT_VERSION,
    issueCount: issues.length,
    issues,
  };
}

function printHelp(): void {
  console.log(`Usage: check-api-property-optionality [options]

Options:
  --format text|json    Output format (default: text). JSON prints a machine-readable report to stdout.
  --write-report PATH   Write the JSON report to PATH (relative paths are resolved from the repo root).
  -h, --help            Show this help.
`);
}

type ParsedArgs = {
  format: 'text' | 'json';
  writeReport: string | undefined;
  help: boolean;
  error?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let format: 'text' | 'json' = 'text';
  let writeReport: string | undefined;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      help = true;

      continue;
    }

    if (arg === '--format') {
      const value = argv[i + 1];

      if (!value || value.startsWith('-')) {
        return { format, writeReport, help: false, error: '--format requires a value: text or json' };
      }

      i++;

      if (value !== 'text' && value !== 'json') {
        return { format, writeReport, help: false, error: `--format must be text or json, got "${value}"` };
      }

      format = value;

      continue;
    }

    if (arg === '--write-report') {
      const value = argv[i + 1];

      if (!value || value.startsWith('-')) {
        return { format, writeReport, help: false, error: '--write-report requires a file path' };
      }

      i++;
      writeReport = value;

      continue;
    }

    return { format, writeReport, help: false, error: `Unknown argument: ${arg}` };
  }

  return { format, writeReport, help };
}

function resolveReportPath(reportPath: string): string {
  if (path.isAbsolute(reportPath)) {
    return reportPath;
  }

  return path.join(REPO_ROOT, reportPath);
}

function isUnderNodeModules(filePath: string): boolean {
  return path.normalize(filePath).split(path.sep).includes('node_modules');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.error) {
    console.error(args.error);
    printHelp();
    process.exitCode = 2;

    return;
  }

  if (args.help) {
    printHelp();

    return;
  }

  const project = new Project({
    tsConfigFilePath: path.join(REPO_ROOT, 'apps/api/tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths(DTO_GLOBS.map((g) => path.join(REPO_ROOT, g)));

  const issues: Issue[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    if (isUnderNodeModules(sourceFile.getFilePath())) {
      continue;
    }

    issues.push(...collectIssuesForFile(sourceFile));
  }

  issues.sort((a, b) => {
    const pathCompare = a.file.localeCompare(b.file);

    if (pathCompare !== 0) {
      return pathCompare;
    }

    return a.line - b.line;
  });

  const report = buildReport(issues);
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (args.writeReport) {
    const outPath = resolveReportPath(args.writeReport);

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, json, 'utf8');
  }

  if (args.format === 'json') {
    process.stdout.write(json);

    if (issues.length > 0) {
      process.exitCode = 1;
    }

    return;
  }

  if (issues.length === 0) {
    console.log('No ApiProperty / ApiPropertyOptional optionality mismatches found.');

    return;
  }

  console.error(`Found ${issues.length} ApiProperty optionality mismatch(es):\n`);

  for (const issue of issues) {
    console.error(`${issue.file}:${issue.line}`);
    console.error(`  ${issue.message}\n`);
  }

  process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
