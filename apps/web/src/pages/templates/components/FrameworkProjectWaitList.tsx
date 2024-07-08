import { Tooltip, Dropdown, CardTile } from '@novu/design-system';
import { Badge } from '@mantine/core';

import { TemplateItem } from './templates-store/templateStoreStyles';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useAuth } from '../../../hooks/useAuth';

const SEGMENT_EVENT = 'Button Clicked - [Bridge promotion]';
const segmentEventAction = {
  dropDownItem: 'Workflows > Dropdown > Bridge item',
  modalItem: 'Workflows > Dropdown > All templates > Bridge item',
  cardTile: 'Workflows > No workflows yet > Bridge item',
};

const handleFrameworkClick = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
  event.preventDefault();
  window.open('https://docs.novu.co/framework/introduction', '_blank');
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

export const FrameworkProjectDropDownItem = () => {
  const segment = useSegment();
  const { currentOrganization } = useAuth();

  return (
    <ToolTip>
      <Dropdown.Item
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
            _organization: currentOrganization?._id,
          });

          handleFrameworkClick(event);
        }}
        data-test-id="framework-project-demand-check-experiment-dropdown-item"
      >
        <NewBadge />
      </Dropdown.Item>
    </ToolTip>
  );
};

export const FrameworkProjectModalItem = () => {
  const segment = useSegment();
  const { currentOrganization } = useAuth();

  return (
    <ToolTip>
      <TemplateItem
        key="new-framework-project"
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
            _organization: currentOrganization?._id,
          });

          handleFrameworkClick(event);
        }}
      >
        <NewBadge marginRight={1} />
      </TemplateItem>
    </ToolTip>
  );
};

export const FrameworkProjectCardTile = () => {
  const segment = useSegment();
  const { currentOrganization } = useAuth();

  return (
    <ToolTip>
      <CardTile
        disabled={false}
        data-test-id="framework-project-demand-check-experiment-tile"
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
            _organization: currentOrganization?._id,
          });

          handleFrameworkClick(event);
        }}
      >
        <NewBadge marginRight={0} />
      </CardTile>
    </ToolTip>
  );
};
