import { cpSync, statSync } from 'node:fs';

cpSync('src', 'build/main', {
  recursive: true,
  filter: (source) => statSync(source).isDirectory() || source.endsWith('.handlebars'),
});
