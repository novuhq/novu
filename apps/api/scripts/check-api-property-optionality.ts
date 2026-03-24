/**
 * Audits DTO class properties for consistency between TypeScript optionality (`?`)
 * and @nestjs/swagger decorators (@ApiProperty vs @ApiPropertyOptional), including
 * explicit `required: true | false` in decorator options.
 *
 * Run: pnpm check:api-property-optionality (from repo root) or pnpm run check:api-property-optionality in apps/api
 */
import path from 'node:path';
import { type Decorator, Project, type SourceFile } from 'ts-morph';
import { SyntaxKind } from 'typescript';

type Issue = { file: string; line: number; message: string };

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
          file: sourceFile.getFilePath(),
          line,
          message: `Property "${propName}" is optional in TypeScript but marked required in OpenAPI (${decoratorName}). Use @ApiPropertyOptional, or @ApiProperty({ required: false }).`,
        });
      } else if (!tsOptional && openApiOptional) {
        issues.push({
          file: sourceFile.getFilePath(),
          line,
          message: `Property "${propName}" is required in TypeScript but marked optional in OpenAPI (${decoratorName}). Use @ApiProperty, or @ApiPropertyOptional({ required: true }).`,
        });
      }
    }
  }

  return issues;
}

function toRelativePath(filePath: string): string {
  return path.relative(REPO_ROOT, filePath);
}

function main(): void {
  const project = new Project({
    tsConfigFilePath: path.join(REPO_ROOT, 'apps/api/tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths(DTO_GLOBS.map((g) => path.join(REPO_ROOT, g)));

  const issues: Issue[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    issues.push(...collectIssuesForFile(sourceFile));
  }

  issues.sort((a, b) => {
    const pathCompare = a.file.localeCompare(b.file);

    if (pathCompare !== 0) {
      return pathCompare;
    }

    return a.line - b.line;
  });

  if (issues.length === 0) {
    console.log('No ApiProperty / ApiPropertyOptional optionality mismatches found.');

    return;
  }

  console.error(`Found ${issues.length} ApiProperty optionality mismatch(es):\n`);

  for (const issue of issues) {
    console.error(`${toRelativePath(issue.file)}:${issue.line}`);
    console.error(`  ${issue.message}\n`);
  }

  process.exitCode = 1;
}

main();
