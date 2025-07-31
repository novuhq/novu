import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/primitives/button';

export function AccessDeniedPage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center" data-error="true">
      <div className="flex w-full flex-col items-center gap-6">
        <div className="text-2xl font-semibold text-[#E2E2E3]">¯\_(ツ)_/¯</div>

        <div className="flex flex-col items-center gap-1">
          <h3 className="text-base font-medium text-gray-900">🔒 Access Denied</h3>
          <p className="max-w-[367px] text-center text-xs font-medium text-[#99A0AE]">
            Your role doesn't have the keys to this door — but hey, you found our nicest error message!
          </p>
        </div>

        <Button
          variant="secondary"
          mode="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="size-4 text-[#525866]" />
          <span className="text-xs font-medium text-[#525866]">Take me back</span>
        </Button>
      </div>
    </div>
  );
}
