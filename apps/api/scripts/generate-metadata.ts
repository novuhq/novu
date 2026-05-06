/**
 * This file is responsible for generating Nest.js metadata for the API.
 * Metadata generation is required when using SWC with Nest.js due to SWC
 * not natively supporting Typescript, which is required to use the `reflect-metadata`
 * API and in turn, resolve types for the OpenAPI specification.
 *
 * The script writes the generated content to a temporary file first and only
 * swaps it onto `src/metadata.ts` when the content has actually changed.
 * This keeps `pnpm build:metadata` idempotent so re-running it (e.g. while
 * `pnpm start:dev` is up) does not touch the file's mtime and therefore
 * does not trigger a spurious watcher restart.
 *
 * @see https://docs.nestjs.com/recipes/swc#monorepo-and-cli-plugins
 */
import fs from 'node:fs';
import path from 'node:path';
import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins';
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin';

const tsconfigPath = 'tsconfig.build.json';
const srcPath = path.join(__dirname, '..', 'src');
const metadataFilename = 'metadata.ts';
const metadataPath = path.join(srcPath, metadataFilename);
const tmpMetadataFilename = 'metadata.tmp.ts';
const tmpMetadataPath = path.join(srcPath, tmpMetadataFilename);

const defaultContent = `export default async () => { return {}; };\n`;

const hadMetadata = fs.existsSync(metadataPath);
const originalContent = hadMetadata ? fs.readFileSync(metadataPath, 'utf8') : '';
const shouldNeutralizeMetadata = originalContent !== defaultContent;

if (shouldNeutralizeMetadata) {
  fs.writeFileSync(metadataPath, defaultContent, 'utf8');
  console.log('metadata.ts reset to default content before generation.');
}

const restoreOriginalMetadata = () => {
  if (hadMetadata) {
    fs.writeFileSync(metadataPath, originalContent, 'utf8');
  } else if (fs.existsSync(metadataPath)) {
    fs.unlinkSync(metadataPath);
  }
};

try {
  const generator = new PluginMetadataGenerator();
  generator.generate({
    visitors: [new ReadonlyVisitor({ introspectComments: true, pathToSource: srcPath })],
    outputDir: srcPath,
    filename: tmpMetadataFilename,
    tsconfigPath,
  });

  const nextContent = fs.readFileSync(tmpMetadataPath, 'utf8');

  if (nextContent === originalContent) {
    if (shouldNeutralizeMetadata) {
      restoreOriginalMetadata();
    }
    console.log('metadata.ts is up to date, skipping write.');
  } else {
    fs.renameSync(tmpMetadataPath, metadataPath);
    console.log('metadata.ts updated.');
  }
} catch (error) {
  if (shouldNeutralizeMetadata) {
    restoreOriginalMetadata();
  }

  throw error;
} finally {
  if (fs.existsSync(tmpMetadataPath)) {
    fs.unlinkSync(tmpMetadataPath);
  }
}
