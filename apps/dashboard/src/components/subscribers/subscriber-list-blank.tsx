import { AddSubscriberIllustration } from '@/components/icons/add-subscriber-illustration';
import { RiBookMarkedLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { LinkButton } from '../primitives/button-link';

export const SubscriberListBlank = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <AddSubscriberIllustration />
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">No subscribers yet</span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          A subscriber represents a notification recipient. Subscribers are created automatically while triggering a
          workflow or can be imported via the API.
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Link to={'https://docs.novu.co/concepts/subscribers#migration-optional'} target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            Import via API
          </LinkButton>
        </Link>

        {/* <Button variant="primary" leadingIcon={RiRouteFill} className="gap-2">
        Create subscriber
      </Button> */}
      </div>
    </div>
  );
};
