// tsup.config.ts
import { defineConfig } from 'tsup';
import * as preset from 'tsup-preset-solid';

const PRESET_OPTIONS: preset.PresetOptions = {
  entries: [
    {
      // entries with '.tsx' extension will have `solid` export condition generated
      entry: 'src/ui/index.tsx',
    },
  ],
  out_dir: 'dist/ui',
  // Set to `true` to remove all `console.*` calls and `debugger` statements in prod builds
  drop_console: true,
  // Set to `true` to generate a CommonJS build alongside ESM
  cjs: true,
};

export default defineConfig((config) => {
  const watching = !!config.watch;

  const PARSED_DATA = preset.parsePresetOptions(PRESET_OPTIONS, watching);

  return preset.generateTsupOptions(PARSED_DATA);
});
