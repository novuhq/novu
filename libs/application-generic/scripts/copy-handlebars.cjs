const fs = require('node:fs');
const path = require('node:path');

// Copies without cpx: it depends on glob 7, which reads minimatch's private `_glob` field.
// The workspace pins minimatch to 11, where that field is gone, so a cpx copy crashes.
function copyHandlebars(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const source = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      copyHandlebars(source);
      continue;
    }

    if (!entry.name.endsWith('.handlebars')) {
      continue;
    }

    const destination = path.join('build/main', path.relative('src', source));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}

copyHandlebars('src');
