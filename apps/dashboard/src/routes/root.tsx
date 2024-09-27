import { ClerkProvider } from '@/components/providers/clerk-provider';
import { SegmentProvider } from '@/components/providers/segment-provider';
import { Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider>
        <SegmentProvider>
          <div className="relative min-h-dvh">
            <div className="fixed left-0 top-0 h-12 w-full bg-green-200">
              <a
                href="/legacy/"
                target="_self"
                className="text-blue-600 visited:text-purple-600 hover:border-current hover:border-b"
              >
                Go to the Web App
              </a>
            </div>

            <div className="pt-12">
              <Outlet />
            </div>
          </div>
        </SegmentProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
}
