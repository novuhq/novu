import React, { useMemo } from 'react';
import { RiMore2Fill } from 'react-icons/ri';
import { ActionWithRulesProps, getParentPath, isRuleGroup } from 'react-querybuilder';

import { Delete } from '@/components/icons/delete';
import { SquareTwoStack } from '@/components/icons/square-two-stack';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useConditionsEditorContext } from './conditions-editor-context';

export const RuleActions = React.memo(
  ({ path, ruleOrGroup, context }: ActionWithRulesProps) => {
    const { removeRuleOrGroup, cloneRuleOrGroup, getParentGroup } = useConditionsEditorContext();
    const parentGroup = useMemo(() => getParentGroup(ruleOrGroup.id), [ruleOrGroup, getParentGroup]);
    const isGroup = isRuleGroup(ruleOrGroup);
    const isDuplicateDisabled = !!(parentGroup && parentGroup.rules && parentGroup.rules.length >= 10);

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <CompactButton
            icon={RiMore2Fill}
            variant="ghost"
            size="lg"
            className="ml-auto size-7 [&_svg]:size-4"
            data-actions
          ></CompactButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" withPortal={false}>
          <DropdownMenuGroup className="*:cursor-pointer">
            <Tooltip>
              <TooltipTrigger>
                <DropdownMenuItem
                  onClick={() => {
                    cloneRuleOrGroup(ruleOrGroup, getParentPath(path));
                    context?.saveForm();
                  }}
                  className="text-foreground-600 text-label-xs h-7"
                  disabled={isDuplicateDisabled}
                >
                  <SquareTwoStack className="[&&]:size-3.5" /> Duplicate {isGroup ? `group` : `condition`}
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipPortal>
                {isDuplicateDisabled && (
                  <TooltipContent className="max-w-52">
                    You cannot duplicate more than 10 groups or conditions
                  </TooltipContent>
                )}
              </TooltipPortal>
            </Tooltip>

            <DropdownMenuItem
              onClick={() => {
                removeRuleOrGroup(path);
                context?.saveForm();
              }}
              className="text-error-base text-label-xs h-7"
            >
              <Delete className="[&&]:size-3.5" />
              Delete {isGroup ? `group` : `condition`}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.path === nextProps.path && prevProps.ruleOrGroup === nextProps.ruleOrGroup;
  }
);
