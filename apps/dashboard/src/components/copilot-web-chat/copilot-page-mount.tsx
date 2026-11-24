import type { CopilotPageEnum } from '@novu/shared';
import { useContext, useEffect } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useCopilotPageView } from './copilot-page-view-store';
import { CopilotPopoverMount } from './copilot-popover';
import { CopilotRegisterContext } from './copilot-web-chat-context';
import { CopilotWebChatProvider } from './copilot-web-chat-provider';
import { useActiveCopilotPage } from './use-copilot-pages';

/** Hands the provider the page and what its tab or panel registered in the page-view store. */
function CopilotPageContextSync({ page }: { page: CopilotPageEnum }) {
  const registerPageContext = useContext(CopilotRegisterContext);
  const view = useCopilotPageView();

  useEffect(
    () => registerPageContext({ page, viewing: view?.viewing, question: view?.question }),
    [registerPageContext, page, view]
  );

  return null;
}

function CopilotPageProvider({ page }: { page: CopilotPageEnum }) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  // One thread per account and environment, shared by every Copilot page.
  const conversationScope =
    currentUser?._id && currentEnvironment?._id ? `${currentUser._id}:${currentEnvironment._id}:pages` : undefined;

  return (
    <CopilotWebChatProvider surface="popover" conversationScope={conversationScope}>
      <CopilotPageContextSync page={page} />
      <CopilotPopoverMount />
    </CopilotWebChatProvider>
  );
}

/**
 * The Copilot on the dashboard pages `COPILOT_PAGES` turns on, rendered beside the page by the app shell. Always the
 * popover, in every environment. Never on a workflow editor path, so it is never mounted together with the editor's
 * `CopilotModeProvider`; pages reach it through the page-view and entry stores instead of React context.
 */
export function CopilotPageMount() {
  const page = useActiveCopilotPage();

  if (!page) return null;

  return <CopilotPageProvider page={page} />;
}
