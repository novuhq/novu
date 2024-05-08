import { ActionIcon } from '@mantine/core';
import { IconInfo, Tooltip } from '@novu/design-system';
import { useDocsContext } from '../providers/DocsProvider';

export const DocsButton = () => {
  const { toggle, enabled } = useDocsContext();

  return (
    <Tooltip label={enabled ? 'Documentation' : 'There is no documentation for this page'}>
      <div>
        <ActionIcon disabled={!enabled} variant="transparent" onClick={() => toggle()}>
          <IconInfo />
        </ActionIcon>
      </div>
    </Tooltip>
  );
};
