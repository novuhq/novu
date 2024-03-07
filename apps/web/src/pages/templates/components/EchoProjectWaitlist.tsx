import { Tooltip, Dropdown, CardTile } from '@novu/design-system';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';

import { TemplatesGroup, TemplateItem, GroupName } from './templates-store/templateStoreStyles';
import { useSegment } from '../../../components/providers/SegmentProvider';

const SEGMENT_EVENT = 'Button Clicked - [Echo promotion]';
const segmentEventAction = {
  dropDownItem: 'Workflows > Dropdown > Echo item',
  modalItem: 'Workflows > Dropdown > All templates > Echo item',
  cardTile: 'Workflows > No workflows yet > Echo item',
};

const handleClick = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
  event.preventDefault();
  window.open('https://novu.co/novu-echo-coming-soon/', '_blank');
};

const ToolTip = ({ children }) => {
  return (
    <Tooltip
      label="Discover a new way that allows you to build powerful, highly customizable workflows on your local machine."
      position="bottom"
      offset={10}
    >
      {children}
    </Tooltip>
  );
};

export const EchoProjectDropDownItem = () => {
  const segment = useSegment();

  return (
    <ToolTip>
      <Dropdown.Item
        icon={<FontAwesomeIcon icon={faBolt} />}
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
          });

          handleClick(event);
        }}
        data-test-id="echo-project-demand-check-experiment-dropdown-item"
      >
        NEW: Work locally
      </Dropdown.Item>
    </ToolTip>
  );
};

export const EchoProjectModalItem = () => {
  const segment = useSegment();

  return (
    <TemplatesGroup key="new">
      <GroupName>New</GroupName>
      <ToolTip>
        <TemplateItem
          key="new-echo-project"
          onClick={(event) => {
            segment.track(SEGMENT_EVENT, {
              action: segmentEventAction.dropDownItem,
            });

            handleClick(event);
          }}
        >
          <FontAwesomeIcon icon={faBolt} />
          <span>NEW: Work locally</span>
        </TemplateItem>
      </ToolTip>
    </TemplatesGroup>
  );
};

export const EchoProjectCardTile = () => {
  const segment = useSegment();

  return (
    <ToolTip>
      <CardTile
        disabled={false}
        data-test-id="echo-project-demand-check-experiment-tile"
        onClick={(event) => {
          segment.track(SEGMENT_EVENT, {
            action: segmentEventAction.dropDownItem,
          });

          handleClick(event);
        }}
      >
        <FontAwesomeIcon icon={faBolt} />
        <span>NEW: Work locally</span>
      </CardTile>
    </ToolTip>
  );
};
