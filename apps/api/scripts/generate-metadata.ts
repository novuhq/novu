/**
 * This file is responsible for generating Nest.js metadata for the API.
 * Metadata generation is required when using SWC with Nest.js due to SWC
 * not natively supporting Typescript, which is required to use the `reflect-metadata`
 * API and in turn, resolve types for the OpenAPI specification.
 *
 * @see https://docs.nestjs.com/recipes/swc#monorepo-and-cli-plugins
 */
import fs from 'node:fs';
import path from 'node:path';
import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins';
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin';

const tsconfigPath = 'tsconfig.build.json';
const srcPath = path.join(__dirname, '..', 'src');
const metadataPath = path.join(srcPath, 'metadata.ts');

/*
 * We create an empty metadata file to ensure that files importing `metadata.ts`
 * will compile successfully before the metadata generation occurs.
 */
const defaultContent = `export default async () => { return {}; };`;

fs.writeFileSync(metadataPath, defaultContent, 'utf8');
console.log('metadata.ts file has been generated with default content.');

const generator = new PluginMetadataGenerator();
generator.generate({
  visitors: [new ReadonlyVisitor({ introspectComments: true, pathToSource: srcPath })],
  outputDir: srcPath,
  tsconfigPath,
});
