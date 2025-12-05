import { useMantineColorScheme } from '@mantine/core';
import { NovuProvider, PopoverNotificationCenter, useUpdateAction } from '@novu/notification-center';
import {
  ButtonTypeEnum,
  IMessage,
  INVITE_TEAM_MEMBER_NUDGE_PAYLOAD_KEY,
  IUserEntity,
  MessageActionStatusEnum,
} from '@novu/shared';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { APP_ID } from '../../../config';
import { useEnvironment } from '../../../hooks';
import { NotificationCenterBell } from './NotificationCenterBell';
import { ROUTES } from '../../../constants/routes';
import { useSegment } from '../../providers/SegmentProvider';
import { apiHostnameManager } from '../../../utils/api-hostname-manager';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvironment();
  const backendUrl = apiHostnameManager.getApiHostname();
  const socketUrl = apiHostnameManager.getWebSocketHostname();

  return (
    <>
      <NovuProvider
        backendUrl={backendUrl}
        socketUrl={socketUrl}
        subscriberId={user?._id as string}
        applicationIdentifier={APP_ID || (environment?.identifier as string)}
      >
        <PopoverWrapper />
      </NovuProvider>
    </>
  );
}

function PopoverWrapper() {
  const { colorScheme } = useMantineColorScheme();
  const { updateAction } = useUpdateAction();
  const segment = useSegment();
  const { currentOrganization, currentUser } = useAuth();

  const navigate = useNavigate();
  function handlerOnNotificationClick(message: IMessage) {
    if (message.payload[INVITE_TEAM_MEMBER_NUDGE_PAYLOAD_KEY]) {
      segment.track('Invite Nudge Clicked', {
        _user: currentUser?._id,
        _organization: currentOrganization?._id,
      });
      navigate(ROUTES.TEAM);
    }

    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  async function handlerOnActionClick(templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) {
    await updateAction({ messageId: message._id, actionButtonType: type, status: MessageActionStatusEnum.DONE });
  }

  return (
    <PopoverNotificationCenter
      colorScheme={colorScheme}
      onNotificationClick={handlerOnNotificationClick}
      onActionClick={handlerOnActionClick}
    >
      {({ unseenCount }) => {
        return <NotificationCenterBell unseenCount={unseenCount} />;
      }}
    </PopoverNotificationCenter>
  );
}
