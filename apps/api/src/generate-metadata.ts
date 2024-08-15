import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins';
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin';

/**
 * This file is responsible for generating Nest.js metadata for the API.
 * Metadata generation is required when using SWC with Nest.js due to SWC
 * not natively supporting Typescript, which is required to use the `reflect-metadata`
 * API and in turn, resolve types for the OpenAPI specification.
 *
 * @see https://docs.nestjs.com/recipes/swc#monorepo-and-cli-plugins
 */
const generator = new PluginMetadataGenerator();
generator.generate({
  visitors: [new ReadonlyVisitor({ introspectComments: true, pathToSource: __dirname })],
  outputDir: __dirname,
  tsconfigPath: 'tsconfig.build.json',
});
