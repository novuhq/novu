import { RiArrowRightSLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ConversationsContent } from '@/components/conversations/conversations-content';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

export function RecentConversationsSection() {
  const { currentEnvironment } = useEnvironment();

  const conversationsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.CONNECT_CONVERSATIONS, { environmentSlug: currentEnvironment.slug })
    : undefined;

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 pt-1 pb-1.5">
        <span className="text-text-soft text-code-xs font-code font-medium uppercase leading-4 tracking-wider">
          Recent conversations
        </span>
        {!IS_SELF_HOSTED && conversationsPath ? (
          <Link
            to={conversationsPath}
            className="ml-auto text-text-sub hover:text-text-strong text-label-xs flex items-center gap-0.5 rounded-lg p-0 font-medium transition-colors"
          >
            View all activity
            <RiArrowRightSLine className="size-4" />
          </Link>
        ) : null}
      </div>
      <ConversationsContent
        className="border-stroke-soft rounded-lg border bg-bg-white"
        contentHeight="h-[420px]"
        redirectConversationSelectionTo={conversationsPath}
      />
    </div>
  );
}
