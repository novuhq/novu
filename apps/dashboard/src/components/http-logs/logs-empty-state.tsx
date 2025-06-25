import { LinkButton } from '@/components/primitives/button-link';
import { RiAddCircleLine, RiBookMarkedLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyTopicsIllustration } from '../topics/empty-topics-illustration';
import { Button } from '../primitives/button';

export const RequestLogsEmptyState = () => {
  const navigate = useNavigate();

  const handleCreateWorkflow = () => {
    navigate('/workflows');
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTopicsIllustration />
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">No activity in past 90 days</span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          Your HTTP logs are empty. Once they start appearing, you’ll be able to track notifications, troubleshoot
          issues, and view delivery details.
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Link to="https://docs.novu.co/platform/concepts/workflows" target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            View Docs
          </LinkButton>
        </Link>

        <Button
          variant="primary"
          mode="gradient"
          size="xs"
          leadingIcon={RiAddCircleLine}
          onClick={handleCreateWorkflow}
        >
          Trigger workflow
        </Button>
      </div>
    </div>
  );
};
