import { AsyncProviderConfig, asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import { lazy, Suspense } from 'react';
import { IS_ENTERPRISE, IS_SELF_HOSTED, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '@/config';
import { detectRegionFromURL, getRegionConfig } from '@/context/region';

function getAwsRegion(): string {
  const currentRegion = detectRegionFromURL();
  const regionConfig = getRegionConfig(currentRegion);
  return regionConfig?.awsRegion || '';
}

const awsRegion = getAwsRegion();

const LD_CONFIG: AsyncProviderConfig = {
  clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
  reactOptions: {
    useCamelCaseFlagKeys: false,
  },
  context: {
    kind: 'multi',
    user: {
      anonymous: true,
    },
    region: {
      key: awsRegion || 'unknown',
      awsRegion: awsRegion,
    },
  },
  options: {
    bootstrap: 'localStorage',
  },
};

const AsyncFeatureFlagsProvider = lazy(async () => {
  if (!LAUNCH_DARKLY_CLIENT_SIDE_ID) {
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
