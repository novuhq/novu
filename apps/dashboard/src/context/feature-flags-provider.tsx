import { IS_ENTERPRISE, IS_SELF_HOSTED, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '@/config';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import { lazy, Suspense } from 'react';

const LD_CONFIG = {
  clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
  reactOptions: {
    useCamelCaseFlagKeys: false,
  },
  context: {
    kind: 'user',
    anonymous: true,
  },
  options: {
    bootstrap: 'localStorage',
  },
} as const;

const AsyncFeatureFlagsProvider = lazy(async () => {
  if (!LAUNCH_DARKLY_CLIENT_SIDE_ID || (IS_SELF_HOSTED && IS_ENTERPRISE)) {
    return {
      default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
  }

  const LaunchDarklyProvider = await asyncWithLDProvider(LD_CONFIG);
  return {
    default: ({ children }: { children: React.ReactNode }) => <LaunchDarklyProvider>{children}</LaunchDarklyProvider>,
  };
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AsyncFeatureFlagsProvider>{children}</AsyncFeatureFlagsProvider>
    </Suspense>
  );
}
