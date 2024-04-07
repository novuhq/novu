import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins';

const generator = new PluginMetadataGenerator();
generator.generate({
  visitors: [],
  outputDir: __dirname,
  watch: true,
  tsconfigPath: 'apps/worker/tsconfig.build.json',
});
