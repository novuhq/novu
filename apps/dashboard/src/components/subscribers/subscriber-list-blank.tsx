import { PermissionsEnum } from '@novu/shared';
import { RiBookMarkedLine, RiRouteFill } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { AddSubscriberIllustration } from '@/components/icons/add-subscriber-illustration';
import { useSubscribersNavigate } from '@/components/subscribers/hooks/use-subscribers-navigate';
import { LinkButton } from '../primitives/button-link';
import { PermissionButton } from '../primitives/permission-button';

export const SubscriberListBlank = () => {
  const { navigateToCreateSubscriberPage } = useSubscribersNavigate();
  return (
    <div className="mt-[100px] flex h-full w-full flex-col items-center justify-center gap-6">
      <AddSubscriberIllustration />
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">No subscribers yet</span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          A subscriber represents a notification recipient. Subscribers are created automatically while triggering a
          workflow or can be imported via the API.
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Link to="https://docs.novu.co/api-reference/subscribers/create-a-subscriber" target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            Import via API
          </LinkButton>
        </Link>

        <PermissionButton
          permission={PermissionsEnum.SUBSCRIBER_WRITE}
          variant="primary"
          leadingIcon={RiRouteFill}
          className="gap-2"
          onClick={navigateToCreateSubscriberPage}
        >
          Create subscriber
        </PermissionButton>
      </div>
    </div>
  );
};
