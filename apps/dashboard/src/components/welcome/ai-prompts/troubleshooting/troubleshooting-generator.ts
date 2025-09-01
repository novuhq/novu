import { FrameworkConfigManager } from '../config/framework-config-manager';

const COMMON_TROUBLESHOOTING = [
  '## Common Issues & Solutions',
  '',
  '### Inbox not rendering',
  '- **Check environment variables**: Ensure your environment variable is properly set and the development server has been restarted.',
  '- **Verify authentication**: Make sure your authentication solution is working and returning a valid user ID.',
  '- **Check console errors**: Look for any JavaScript errors that might prevent the component from rendering.',
  '',
  '### Notifications not appearing',
  "- **Verify workflow creation**: Ensure you've created and triggered a workflow in the Novu dashboard.",
  '- **Check subscriber ID**: Make sure the subscriber ID in your code matches the one used when triggering notifications. You can verify this in the Novu dashboard under Subscribers or Activity Feed.',
  '- **Verify application identifier**: Confirm the application identifier matches your Novu project.',
  '',
  '### TypeScript errors',
  '- **Install types**: Ensure you have the correct TypeScript types installed for your framework.',
  "- **Check imports**: Verify you're importing from the correct package (e.g., @novu/nextjs for Next.js).",
  "- **Update dependencies**: Make sure you're using the latest version of the Novu package.",
];

const FRAMEWORK_SPECIFIC_TROUBLESHOOTING: Record<string, string[]> = {
  'Next.js': [
    '',
    '### Next.js specific issues',
    "- **Hydration errors**: Ensure you're checking `isLoaded` before rendering the Inbox component.",
    '- **Environment variables**: Use `NEXT_PUBLIC_` prefix for client-side environment variables.',
    '- **Layout placement**: Place the Inbox component in the correct layout file (usually app/layout.tsx).',
  ],

  React: [
    '',
    '### React specific issues',
    '- **Component mounting**: Ensure the NovuInbox component is properly mounted in your app.',
    '- **Environment variables**: Use `VITE_` prefix for Vite-based React projects.',
    '- **Authentication state**: Handle loading states properly to prevent rendering issues.',
  ],

  JavaScript: [
    '',
    '### JavaScript SDK specific issues',
    '- **Initialization**: Ensure Novu is initialized before calling any methods.',
    '- **Error handling**: Wrap API calls in try-catch blocks to handle network failures.',
    '- **Real-time events**: Set up event listeners after successful initialization.',
    '- **Custom UI**: Remember this is a headless solution - you need to build your own UI components.',
  ],

  Angular: [
    '',
    '### Angular specific issues',
    '- **ViewChild setup**: Ensure ViewChild decorator is properly configured.',
    '- **Environment configuration**: Check environment.ts file for proper variable setup.',
    '- **Change detection**: Use ChangeDetectorRef when updating notification state.',
  ],

  Vue: [
    '',
    '### Vue specific issues',
    '- **Composition API**: Ensure proper setup with Vue 3 Composition API.',
    '- **Template refs**: Check ref and onMounted usage for DOM element access.',
    '- **Environment variables**: Verify VITE_ prefix in .env files.',
  ],

  Remix: [
    '',
    '### Remix specific issues',
    '- **Component placement**: Check NotificationCenter component location.',
    '- **Environment loading**: Verify environment variables are properly loaded.',
    '- **Server/Client code**: Ensure proper code splitting between server and client.',
  ],

  Native: [
    '',
    '### React Native specific issues',
    '- **NovuProvider**: Verify proper provider wrapping of app components.',
    '- **Environment setup**: Check Expo configuration for environment variables.',
    '- **Platform-specific issues**: Handle iOS and Android differences appropriately.',
  ],
};

export function generateTroubleshootingSection(framework: string): string[] {
  const configManager = new FrameworkConfigManager(framework);
  const config = configManager.getConfig();

  const troubleshooting = [
    ...COMMON_TROUBLESHOOTING,
    '',
    `### Package-specific troubleshooting`,
    `- **Package version**: Ensure you're using the latest version of ${config.packageName}.`,
    `- **Environment variable**: Check that ${config.envVarName} is properly set in ${config.envFileName}.`,
  ];

  // Add framework-specific troubleshooting if available
  const frameworkTroubleshooting = FRAMEWORK_SPECIFIC_TROUBLESHOOTING[framework];
  if (frameworkTroubleshooting) {
    troubleshooting.push(...frameworkTroubleshooting);
  }

  return troubleshooting;
}
