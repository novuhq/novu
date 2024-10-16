import React, { ReactNode, useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { PopoverPortal } from '@radix-ui/react-popover';
import { Node } from './base-node';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { Badge, BadgeContent } from '../primitives/badge';
import { cn } from '@/utils/ui';
import { StepTypeEnum } from '@/utils/enums';

const MenuGroup = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col">{children}</div>;
};

const MenuTitle = ({ children }: { children: ReactNode }) => {
  return (
    <span className="bg-neutral-alpha-50 text-foreground-400 border-neutral-alpha-100 border-b p-1.5 text-xs uppercase">
      {children}
    </span>
  );
};

const MenuItemsGroup = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col gap-1 p-1">{children}</div>;
};

const MenuItem = ({
  children,
  stepType,
  disabled = true,
  onClick,
}: {
  children: ReactNode;
  stepType: StepTypeEnum;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}) => {
  const Icon = STEP_TYPE_TO_ICON[stepType];
  const color = STEP_TYPE_TO_COLOR[stepType];

  return (
    <span
      onClick={onClick}
      className={cn(
        'shadow-xs text-foreground-600 hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg p-1.5',
        {
          'text-foreground-300 cursor-not-allowed': disabled,
        }
      )}
    >
      <Icon className={`text-${color} bg-neutral-alpha-50 h-6 w-6 rounded-md p-1 opacity-40`} />
      <span className="text-xs">{children}</span>
      {disabled && (
        <Badge kind="pill" variant="soft" className="ml-auto opacity-40">
          <BadgeContent variant="neutral">soon</BadgeContent>
        </Badge>
      )}
    </span>
  );
};

export const AddStepMenu = ({
  visible = false,
  onMenuItemClick,
}: {
  visible?: boolean;
  onMenuItemClick: (stepType: StepTypeEnum) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleMenuItemClick = (stepType: StepTypeEnum) => {
    onMenuItemClick(stepType);
    setIsPopoverOpen(false);
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(newIsOpen) => {
        setIsPopoverOpen(newIsOpen);
      }}
    >
      <PopoverTrigger asChild>
        <span>
          <Node
            variant="sm"
            className={cn('opacity-0 transition duration-300 ease-out hover:opacity-100', {
              'opacity-100': isPopoverOpen || visible,
            })}
          >
            <RiAddLine className="h-4 w-4" />
          </Node>
        </span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent side="right" className="flex w-[200px] flex-col rounded-lg p-0">
          <div>
            <MenuGroup>
              <MenuTitle>Channels</MenuTitle>
              <MenuItemsGroup>
                <MenuItem stepType={StepTypeEnum.EMAIL}>Email</MenuItem>
                <MenuItem
                  stepType={StepTypeEnum.IN_APP}
                  disabled={false}
                  onClick={() => handleMenuItemClick(StepTypeEnum.IN_APP)}
                >
                  In-App
                </MenuItem>
                <MenuItem stepType={StepTypeEnum.PUSH}>Push</MenuItem>
                <MenuItem stepType={StepTypeEnum.CHAT}>Chat</MenuItem>
                <MenuItem stepType={StepTypeEnum.SMS}>SMS</MenuItem>
              </MenuItemsGroup>
            </MenuGroup>
            <MenuGroup>
              <MenuTitle>Action Steps</MenuTitle>
              <MenuItemsGroup>
                <MenuItem stepType={StepTypeEnum.DIGEST}>Digest</MenuItem>
                <MenuItem stepType={StepTypeEnum.DELAY}>Delay</MenuItem>
              </MenuItemsGroup>
            </MenuGroup>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
