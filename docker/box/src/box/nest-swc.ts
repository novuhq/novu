// `node nest-swc.ts <file...>`, run in a Nest app's folder: compiles only those files into dist, as `nest build`
// does (Nest's own SWC compiler with the app's nest-cli.json and tsconfig.build.json), so its output is the same.
// Its own process: Nest's CLI reads the folder it runs in.
import { createRequire } from 'node:module';

const files = process.argv.slice(2);
const nest = createRequire(`${process.cwd()}/package.json`);
const { SwcCompiler } = nest('@nestjs/cli/lib/compiler/swc/swc-compiler');
const { swcDefaultsFactory } = nest('@nestjs/cli/lib/compiler/defaults/swc-defaults');
const { TsConfigProvider } = nest('@nestjs/cli/lib/compiler/helpers/tsconfig-provider');
const { TypeScriptBinaryLoader } = nest('@nestjs/cli/lib/compiler/typescript-loader');
const configuration = nest('./nest-cli.json');
const { options: tsOptions } = new TsConfigProvider(new TypeScriptBinaryLoader()).getByConfigFilename(
  'tsconfig.build.json'
);
const options = swcDefaultsFactory({ ...tsOptions, outDir: 'dist' }, configuration);
options.cliOptions = { ...options.cliOptions, filenames: files, quiet: true };
await new SwcCompiler({}).runSwc(options, { watch: false }, configuration.compilerOptions?.builder?.options?.swcrcPath);
