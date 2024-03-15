import { Tooltip, Dropdown, CardTile } from '@novu/design-system';
import { Badge } from '@mantine/core';

import { TemplateItem } from './templates-store/templateStoreStyles';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useAuthContext } from '@novu/shared-web';

const SEGMENT_EVENT = 'Button Clicked - [Echo promotion]';
const segmentEventAction = {
  dropDownItem: 'Workflows > Dropdown > Echo item',
  modalItem: 'Workflows > Dropdown > All templates > Echo item',
  cardTile: 'Workflows > No workflows yet > Echo item',
};

const handleEchoClick = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
  event.preventDefault();
  window.open('https://docs.novu.co/echo/introduction', '_blank');
};

const NewBadge = (props) => {
  return (
    <>
      <Badge
        sx={{
          padding: 5,
          pointerEvents: 'none',
          border: 'none',
          background: '#dd2476',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
          marginRight: props.marginRight ?? 10,
        }}
      >
        NEW
      </Badge>
      Code Based
    </>
  );
};

const ToolTip = ({ children }) => {
  return (
    <Tooltip
      multiline
      width={220}
      label={
        'Discover a new way that allows you to build powerful, highly customizable workflows in your IDE.' +
        'Integrated with React Email and MJML.'
      }
      position="right"
      offset={10}
    >
      {children}
    </Tooltip>
  );
};

export const EchoProjectDropDownItem = () => {
  const segment = useSegment();
  const { currentOrganization } = useAuthContext();

  return (
    <ToolTip>
      <Dropdown.Item
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
            _organization: currentOrganization?._id,
          });

          handleEchoClick(event);
        }}
        data-test-id="echo-project-demand-check-experiment-dropdown-item"
      >
        <NewBadge />
      </Dropdown.Item>
    </ToolTip>
  );
};

export const EchoProjectModalItem = () => {
  const segment = useSegment();
  const { currentOrganization } = useAuthContext();

  return (
    <ToolTip>
      <TemplateItem
        key="new-echo-project"
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
            _organization: currentOrganization?._id,
          });

          handleEchoClick(event);
        }}
      >
        <NewBadge marginRight={1} />
      </TemplateItem>
    </ToolTip>
  );
};

export const EchoProjectCardTile = () => {
  const segment = useSegment();
  const { currentOrganization } = useAuthContext();

  return (
    <ToolTip>
      <CardTile
        disabled={false}
        data-test-id="echo-project-demand-check-experiment-tile"
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
            _organization: currentOrganization?._id,
          });

          handleEchoClick(event);
        }}
      >
        <NewBadge marginRight={0} />
      </CardTile>
    </ToolTip>
  );
};
