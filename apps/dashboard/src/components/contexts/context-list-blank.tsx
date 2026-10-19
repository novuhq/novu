import { RiBookMarkedLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { LinkButton } from '@/components/primitives/button-link';
import { CreateContextButton } from './context-list';
import { EmptyContextsIllustration } from './empty-contexts-illustration';

export const ContextListBlank = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyContextsIllustration />
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">Organize with contexts</span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          Create a context (tenant / app / workspace) to scope Inbox feeds per context, reuse chat credentials, and
          drive conditional content.
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Link to="https://docs.novu.co/platform/workflow/advanced-features/contexts" target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            View Docs
          </LinkButton>
        </Link>

        <CreateContextButton />
      </div>
    </div>
  );
};
