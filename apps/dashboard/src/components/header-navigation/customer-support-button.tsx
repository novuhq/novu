import { FeatureFlagsKeysEnum } from '@novu/shared';
import { RiQuestionFill } from 'react-icons/ri';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { IS_SELF_HOSTED_CE } from '../../config';
import { openInNewTab } from '../../utils/url';
import { HeaderButton } from './header-button';
import { SupportDrawer } from './support-drawer';

export const CustomerSupportButton = () => {
  const { showPlainLiveChat } = usePlainChat();
  const isContextualHelpEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXTUAL_HELP_DRAWER_ENABLED);

  // On CE the help icon deep-links to the hosted-upgrade page; EE renders no button at all
  // (the parent header gates on `!IS_SELF_HOSTED_EE`), and Cloud gets the support drawer/chat.
  if (IS_SELF_HOSTED_CE) {
    return (
      <button
        tabIndex={-1}
        className="flex items-center justify-center"
        onClick={() => openInNewTab('https://go.novu.co/hosted-upgrade?utm_campaign=help-icon')}
      >
        <HeaderButton label="Help">
          <RiQuestionFill className="text-foreground-600 size-4" />
        </HeaderButton>
      </button>
    );
  }

  return isContextualHelpEnabled ? (
    <SupportDrawer>
      <button tabIndex={-1} className="flex items-center justify-center">
        <HeaderButton label="Help">
          <RiQuestionFill className="text-foreground-600 size-4" />
        </HeaderButton>
      </button>
    </SupportDrawer>
  ) : (
    <button tabIndex={-1} className="flex items-center justify-center" onClick={() => showPlainLiveChat()}>
      <HeaderButton label="Help">
        <RiQuestionFill className="text-foreground-600 size-4" />
      </HeaderButton>
    </button>
  );
};
