import { RiQuestionAnswerLine } from 'react-icons/ri';
import { Button } from '../primitives/button';
import { Plug } from '../icons/plug';
import { usePlainChat } from '@/hooks/use-plain-chat';

export function ServerErrorPage() {
  const { showPlainLiveChat } = usePlainChat();

  return (
    <div className="peer flex h-full w-full flex-col items-center justify-center" data-error="true">
      <div className="relative flex w-3/4 flex-col items-center justify-center gap-3">
        <div className="absolute inset-0 -z-50 h-full w-full rounded-[866px] border border-dashed border-[#E7E7E7] bg-[#E7E7E7] blur-[220px]" />
        <div className="flex w-40 items-center gap-3 rounded-md border border-[#e6e6e6] bg-white px-3 py-4 shadow-[0px_4.233px_4.233px_0px_rgba(31,40,55,0.02),0px_1.693px_1.693px_0px_rgba(31,40,55,0.02),0px_-3px_0px_0px_#F7F7F7_inset]">
          <span className="size-3 rounded-full bg-[#e6e6e6]" />
          <span className="h-3 flex-1 rounded-md bg-[#e6e6e6]" />
        </div>
        <Plug className="size-4 text-[#E6E6E6]" />
        <div className="w-40 rounded-md border border-[#e6e6e6] bg-white px-3 py-1 text-center shadow-[0px_4.233px_4.233px_0px_rgba(31,40,55,0.02),0px_1.693px_1.693px_0px_rgba(31,40,55,0.02),0px_-3px_0px_0px_#F7F7F7_inset]">
          <p className="text-2xl font-extrabold text-[#ebecef]">500</p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="font-medium text-gray-900">Uh-oh, this is on us, not you.</p>
          <div>
            <p className="text-text-soft text-center text-xs font-medium">
              Whoops, we missed a beat. This 500 is a reminder
            </p>
            <p className="text-text-soft text-center text-xs font-medium">we're still human… mostly.</p>
          </div>

          <Button
            leadingIcon={RiQuestionAnswerLine}
            size="sm"
            variant="secondary"
            mode="outline"
            className="mt-3"
            onClick={showPlainLiveChat}
          >
            Get in Touch
          </Button>
        </div>
      </div>
    </div>
  );
}
