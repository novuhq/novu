import { RiQuestionFill } from 'react-icons/ri';
import { useBootIntercom } from '@/hooks/use-boot-intercom';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { IS_SELF_HOSTED } from '../../config';
import { openInNewTab } from '../../utils/url';
import { HeaderButton } from './header-button';
import { SupportDrawer } from './support-drawer';

export const CustomerSupportButton = () => {
  usePlainChat();
  useBootIntercom();

  if (IS_SELF_HOSTED) {
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

  return (
    <SupportDrawer>
      <button tabIndex={-1} className="flex items-center justify-center">
        <HeaderButton label="Help">
          <RiQuestionFill className="text-foreground-600 size-4" />
        </HeaderButton>
      </button>
    </SupportDrawer>
  );
};
