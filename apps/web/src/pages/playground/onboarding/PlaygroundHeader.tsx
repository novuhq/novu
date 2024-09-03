import { useState } from 'react';
import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { useDisclosure } from '@mantine/hooks';
import { IconPlayArrow, successMessage, errorMessage, Tooltip } from '@novu/design-system';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { navigateToWorkflows } from '../../../utils/playground-navigation';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { ExecutionDetailsModalWrapper } from '../../templates/components/ExecutionDetailsModalWrapper';

export function Header({ handleTestClick }: { handleTestClick: () => Promise<any> }) {
  const segment = useSegment();
  const [isTestRan, setTestTestRan] = useState(false);

  const handleContinue = () => {
    navigateToWorkflows();

    if (isTestRan) {
      segment.track('Playground Continue Clicked - [Playground]', {
        type: 'continue',
      });
    } else {
      segment.track('Playground Skip Clicked - [Playground]', {
        type: 'skip',
      });
    }
  };

  return (
    <HStack
      justify={'space-between'}
      className={css({
        width: '100%',
        height: '44px',
        padding: '8px',
      })}
    >
      <HStack justify={'start'} gap={0} data-test-id="playground-header-title">
        <img
          src={`/static/images/novu-gray.svg`}
          className={css({
            h: '20px',
            w: '20px',
            borderRadius: '100',
            margin: '8px',
          })}
        />
        <span
          className={css({
            color: 'typography.text.secondary',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: '600',
            lineHeight: '20px',
            padding: '8px',
          })}
        >
          Playground
        </span>
      </HStack>
      <div>
        {isTestRan ? (
          <Button
            size="sm"
            onClick={handleContinue}
            className={css({ background: '#3CB179 !important', marginRight: '10px' })}
          >
            Continue
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleContinue}
            className={css({ color: '#828299 !important', '& span': { color: '#828299 !important' } })}
          >
            Skip Playground
          </Button>
        )}

        <TriggerActionModal handleTestClick={handleTestClick} onTestRun={() => setTestTestRan(true)} />
      </div>
    </HStack>
  );
}

const TriggerActionModal = ({
  handleTestClick,
  onTestRun,
}: {
  handleTestClick: () => Promise<any>;
  onTestRun: () => void;
}) => {
  const studioState = useStudioState() || {};
  const [transactionId, setTransactionId] = useState<string>('');
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const segment = useSegment();

  const handleOnRunTestClick = async () => {
    setIsLoading(true);
    try {
      const res = await handleTestClick();

      if (res?.data?.status === 'processed') {
        successMessage('Workflow triggered successfully');
        segment.track('Workflow triggered successfully - [Playground]');
      } else {
        errorMessage('Workflow triggered unsuccessfully');
        segment.track('Workflow triggered unsuccessfully - [Playground]');
      }

      setTransactionId(res.data.transactionId);
      openExecutionModal();
      onTestRun();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Tooltip label={`Trigger a test of this workflow, delivered to: ${studioState?.testUser?.emailAddress} address`}>
        <Button
          data-test-id="trigger-test-button"
          className={css({
            background: '#292933 !important',
          })}
          size="sm"
          Icon={IconPlayArrow}
          onClick={handleOnRunTestClick}
          loading={isLoading}
        >
          Run a test
        </Button>
      </Tooltip>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </>
  );
};
