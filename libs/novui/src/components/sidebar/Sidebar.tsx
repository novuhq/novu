import { MouseEventHandler, ReactNode } from 'react';
import { MdClose } from 'react-icons/md';
import { Flex } from '../../../styled-system/jsx';
import { sidebar } from '../../../styled-system/recipes';
import { Title } from '../title';
import { BUTTON_SIZE_TO_ICON_SIZE } from '../button/Button.const';
import { Button } from '../button';

export const Sidebar = (props: { children: ReactNode; title: ReactNode; onClose: MouseEventHandler }) => {
  const classNames = sidebar();

  return (
    <div className={classNames.sidebar}>
      <Flex className={classNames.header} justify="space-between">
        <Title variant="section">{props.title}</Title>
        <Button size="sm" variant="transparent" onClick={props.onClose}>
          <MdClose size={BUTTON_SIZE_TO_ICON_SIZE['sm']} title="Close Sidebar" />
        </Button>
      </Flex>
      {props.children}
    </div>
  );
};
