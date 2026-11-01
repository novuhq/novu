import { HelpTopBarField, useHelpPanel } from '@/components/help-panel';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { IS_SELF_HOSTED_CE } from '../../config';
import { openInNewTab } from '../../utils/url';
import { HelpIconButton } from './help-icon-button';

export const CustomerSupportButton = () => {
  const { showPlainLiveChat } = usePlainChat();
  const { isEnabled: isHelpPanelEnabled } = useHelpPanel();

  // On CE the help icon deep-links to the hosted-upgrade page; EE renders no button at all
  // (the parent header gates on `!IS_SELF_HOSTED_EE`), and Cloud gets the help panel/chat.
  if (IS_SELF_HOSTED_CE) {
    return <HelpIconButton onClick={() => openInNewTab('https://go.novu.co/hosted-upgrade?utm_campaign=help-icon')} />;
  }

  if (isHelpPanelEnabled) {
    return <HelpTopBarField />;
  }

  return <HelpIconButton onClick={() => showPlainLiveChat()} />;
};
