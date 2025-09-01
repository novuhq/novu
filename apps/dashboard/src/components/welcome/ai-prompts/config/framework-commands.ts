// Framework-specific project creation commands
export const PROJECT_CREATION_COMMANDS: Record<string, string> = {
  'Next.js': 'npm create next-app@latest',
  React: 'npm create vite@latest novu-inbox-react -- --template react-ts',
  Angular: 'ng new novu-inbox-angular',
  Vue: 'npm create vue@latest novu-inbox-vue',
  Remix: 'npx create-remix@latest',
};

// Framework-specific run commands
export const RUN_COMMANDS: Record<string, string> = {
  'Next.js': 'npm run dev',
  React: 'npm run dev',
  Angular: 'npm run start',
  Vue: 'npm run start',
  Remix: 'npm run dev',
  JavaScript: 'npm run dev',
  Native: 'npm run dev',
};
