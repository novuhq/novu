import { PermissionsEnum } from '@novu/shared';
import { RiArrowRightSLine, RiBookMarkedLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { PermissionButton } from '@/components/primitives/permission-button';
import { AGENTS_DOCS_HOME_URL } from '@/utils/agent-docs';
import { ROUTES } from '@/utils/routes';

const EMPTY_STATE_ILLUSTRATION = '/images/workflow-agent-assignment-empty-state.svg';

export function WorkflowAgentAssignmentEmptyState() {
  const navigate = useNavigate();

  const handleSetupAgent = () => {
    void navigate(ROUTES.AGENTS_SETUP);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-3 py-4">
      <img src={EMPTY_STATE_ILLUSTRATION} alt="" width={246} height={104} className="h-[104px] w-[246px] shrink-0" />

      <div className="flex max-w-[400px] flex-col items-center gap-1 text-center">
        <p className="text-text-sub text-label-xs">Setup agent to handle replies</p>
        <p className="text-text-soft text-label-xs leading-4">
          Once an agent is added to Novu, its channels
          <br />
          and reply-to address show up here.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <PermissionButton
          permission={PermissionsEnum.AGENT_WRITE}
          variant="secondary"
          mode="gradient"
          size="2xs"
          trailingIcon={RiArrowRightSLine}
          onClick={handleSetupAgent}
        >
          Setup agent
        </PermissionButton>

        <a
          href={AGENTS_DOCS_HOME_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="text-text-sub text-label-xs hover:text-text-strong flex items-center gap-1 py-1.5 underline transition-colors"
        >
          <RiBookMarkedLine className="size-4 shrink-0" aria-hidden />
          Learn more
        </a>
      </div>
    </div>
  );
}
