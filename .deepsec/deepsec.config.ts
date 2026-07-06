import { defineConfig } from 'deepsec/config';

export default defineConfig({
  projects: [
    { id: 'novu', root: '..' },
    // <deepsec:projects-insert-above>
  ],
});
